package gzdb

import (
	"errors"
	"slices"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// This explicit transaction starts with a write to serialize SQLite claims.
// TxWithSpan is a tracing helper, not a transaction.
func (g *gormZenaoDB) ClaimStripeOnboarding(scope zeni.StripeOnboardingScope, verifiedExistingID string, now time.Time) (*zeni.StripeOnboardingOperation, error) {
	id, err := strconv.ParseUint(scope.CommunityID, 10, 64)
	if err != nil || scope.PlatformAccountID == "" {
		return nil, zeni.ErrOnboardingReconciliation
	}
	var out zeni.StripeOnboardingOperation
	err = g.db.Transaction(func(tx *gorm.DB) error {
		opID := uuid.NewString()
		fresh := zeni.StripeOnboardingOperation{CommunityID: uint(id), PlatformType: zeni.PaymentPlatformStripeConnect,
			OperationID: opID, PlatformAccountID: scope.PlatformAccountID, LiveMode: scope.LiveMode,
			Fingerprint: zeni.StripeOnboardingFingerprint, IdempotencyKey: "zenao.account-create.v1:" + opID, State: "reserved", LeaseUntil: time.Unix(0, 0).UTC()}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&fresh).Error; err != nil {
			return err
		}
		roles, e := (&gormZenaoDB{db: tx}).EntityRoles(zeni.EntityTypeUser, scope.ActorID, zeni.EntityTypeCommunity, scope.CommunityID)
		if e != nil {
			return e
		}
		if scope.ActorID == "" || !slices.Contains(roles, zeni.RoleAdministrator) {
			return zeni.ErrOnboardingUnauthorized
		}
		if err := tx.First(&out, "community_id = ? AND platform_type = ?", id, zeni.PaymentPlatformStripeConnect).Error; err != nil {
			return err
		}
		var existing PaymentAccount
		e = tx.Unscoped().Where("community_id = ? AND platform_type = ?", id, zeni.PaymentPlatformStripeConnect).First(&existing).Error
		if e != nil && !errors.Is(e, gorm.ErrRecordNotFound) {
			return e
		}
		if e == nil {
			if existing.DeletedAt.Valid || existing.PlatformAccountID == "" || verifiedExistingID != existing.PlatformAccountID || (out.AccountID != "" && out.AccountID != existing.PlatformAccountID) {
				return zeni.ErrOnboardingReconciliation
			}
			out.AccountID = existing.PlatformAccountID
		}
		if out.AccountID != "" && (e != nil || verifiedExistingID != out.AccountID || out.AccountID == scope.PlatformAccountID) {
			return zeni.ErrOnboardingReconciliation
		}
		// Legacy unmapped communities require an explicit operator disposition;
		// there is deliberately no unlock or new-key fallback in this change.
		if out.State == "legacy_blocked" && out.AccountID == "" {
			return zeni.ErrOnboardingReconciliation
		}
		if out.PlatformAccountID != "" && (out.PlatformAccountID != scope.PlatformAccountID || out.LiveMode != scope.LiveMode || out.Fingerprint != zeni.StripeOnboardingFingerprint) {
			return zeni.ErrOnboardingReconciliation
		}
		if out.LeaseUntil.After(now) {
			return zeni.ErrOnboardingBusy
		}
		if out.AccountID == "" && out.State == "blocked" {
			return zeni.ErrOnboardingReconciliation
		}
		if out.AccountID == "" && out.FirstAttemptAt == nil && out.State != "reserved" {
			return zeni.ErrOnboardingReconciliation
		}
		if out.AccountID == "" && out.FirstAttemptAt != nil && (now.Before(*out.FirstAttemptAt) || !now.Add(10*time.Second).Before(out.FirstAttemptAt.Add(zeni.StripeOnboardingReplayWindow))) {
			return zeni.ErrOnboardingReconciliation
		}
		updates := map[string]any{"platform_account_id": scope.PlatformAccountID, "live_mode": scope.LiveMode, "fingerprint": zeni.StripeOnboardingFingerprint,
			"account_id": out.AccountID, "fence": out.Fence + 1, "lease_until": now.Add(zeni.StripeOnboardingLease)}
		if out.OperationID == "" {
			updates["operation_id"] = opID
			updates["idempotency_key"] = "zenao.account-create.v1:" + opID
		}
		if out.AccountID == "" {
			updates["state"] = "creating"
			if out.FirstAttemptAt == nil {
				updates["first_attempt_at"] = now
			}
		} else {
			updates["state"] = "known"
		}
		r := tx.Model(&zeni.StripeOnboardingOperation{}).Where("community_id = ? AND platform_type = ? AND fence = ?", id, zeni.PaymentPlatformStripeConnect, out.Fence).Updates(updates)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return zeni.ErrOnboardingFence
		}
		return tx.First(&out, "community_id = ? AND platform_type = ?", id, zeni.PaymentPlatformStripeConnect).Error
	})
	return &out, err
}

func onboardingFence(tx *gorm.DB, c *zeni.StripeOnboardingOperation, now time.Time) *gorm.DB {
	return tx.Model(&zeni.StripeOnboardingOperation{}).Where("community_id = ? AND platform_type = ? AND operation_id = ? AND platform_account_id = ? AND live_mode = ? AND fence = ? AND lease_until > ?", c.CommunityID, c.PlatformType, c.OperationID, c.PlatformAccountID, c.LiveMode, c.Fence, now)
}

func (g *gormZenaoDB) CompleteStripeOnboardingAccount(c *zeni.StripeOnboardingOperation, accountID string, now time.Time) error {
	if accountID == "" || accountID == c.PlatformAccountID {
		return zeni.ErrOnboardingReconciliation
	}
	return g.db.Transaction(func(tx *gorm.DB) error {
		r := onboardingFence(tx, c, now).Where("account_id = '' OR account_id = ?", accountID).Updates(map[string]any{"account_id": accountID, "state": "known"})
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return zeni.ErrOnboardingFence
		}
		p := PaymentAccount{CommunityID: c.CommunityID, PlatformType: c.PlatformType, PlatformAccountID: accountID, OnboardingState: zeni.PaymentOnboardingStateStarted, StartedAt: now, VerificationState: zeni.PaymentVerificationStatePending}
		if e := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&p).Error; e != nil {
			return e
		}
		var current PaymentAccount
		if e := tx.Unscoped().Where("community_id = ? AND platform_type = ?", c.CommunityID, c.PlatformType).First(&current).Error; e != nil {
			return e
		}
		if current.DeletedAt.Valid || current.PlatformAccountID != accountID {
			return zeni.ErrOnboardingReconciliation
		}
		return nil
	})
}

func (g *gormZenaoDB) FinishStripeOnboarding(c *zeni.StripeOnboardingOperation, state string, now time.Time) error {
	if state != "known" && state != "unknown" && state != "blocked" {
		return zeni.ErrOnboardingReconciliation
	}
	r := onboardingFence(g.db, c, now).Updates(map[string]any{"state": state, "lease_until": time.Unix(0, 0).UTC()})
	if r.Error != nil {
		return r.Error
	}
	if r.RowsAffected != 1 {
		return zeni.ErrOnboardingFence
	}
	return nil
}

func (g *gormZenaoDB) BeginPaymentAccountVerification(account *zeni.PaymentAccount, scope zeni.StripeOnboardingScope, now time.Time) (*zeni.PaymentAccountVerificationClaim, error) {
	if scope.CommunityID != account.CommunityID || scope.PlatformAccountID == "" || account.PlatformAccountID == "" || account.PlatformAccountID == scope.PlatformAccountID || account.PlatformType != zeni.PaymentPlatformStripeConnect {
		return nil, zeni.ErrOnboardingReconciliation
	}
	claim := &zeni.PaymentAccountVerificationClaim{Scope: scope}
	err := g.db.Transaction(func(tx *gorm.DB) error {
		id, e := strconv.ParseUint(account.CommunityID, 10, 64)
		if e != nil {
			return e
		}
		guard := zeni.StripeOnboardingOperation{CommunityID: uint(id), PlatformType: account.PlatformType, AccountID: account.PlatformAccountID, State: "legacy_blocked", LeaseUntil: time.Unix(0, 0).UTC()}
		if e = tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&guard).Error; e != nil {
			return e
		}
		var head zeni.StripeOnboardingOperation
		e = tx.First(&head, "community_id = ? AND platform_type = ?", account.CommunityID, account.PlatformType).Error
		if e != nil && !errors.Is(e, gorm.ErrRecordNotFound) {
			return e
		}
		if e == nil && head.PlatformAccountID != "" && (head.PlatformAccountID != scope.PlatformAccountID || head.LiveMode != scope.LiveMode || head.AccountID != account.PlatformAccountID) {
			return zeni.ErrOnboardingReconciliation
		}
		claim.HeadFence = head.Fence
		r := tx.Model(&PaymentAccount{}).Where("id = ? AND platform_account_id = ?", account.ID, account.PlatformAccountID).Updates(map[string]any{"verification_generation": gorm.Expr("verification_generation + 1"), "verification_lease_until": now.Add(zeni.StripeOnboardingLease)})
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return zeni.ErrOnboardingFence
		}
		return tx.Model(&PaymentAccount{}).Select("verification_generation").Where("id = ?", account.ID).Scan(&claim.Generation).Error
	})
	return claim, err
}

func (g *gormZenaoDB) CompletePaymentAccountVerification(p *zeni.PaymentAccount, claim *zeni.PaymentAccountVerificationClaim, now time.Time) (bool, error) {
	applied := false
	err := g.db.Transaction(func(tx *gorm.DB) error {
		r := tx.Model(&PaymentAccount{}).Where("id = ? AND platform_account_id = ? AND verification_generation = ? AND verification_lease_until > ?", p.ID, p.PlatformAccountID, claim.Generation, now).Where("EXISTS (SELECT 1 FROM stripe_onboarding_operations WHERE community_id = ? AND platform_type = ? AND fence = ? AND (platform_account_id = '' OR (platform_account_id = ? AND live_mode = ?)) AND (account_id = '' OR account_id = ?))", p.CommunityID, p.PlatformType, claim.HeadFence, claim.Scope.PlatformAccountID, claim.Scope.LiveMode, p.PlatformAccountID).Updates(map[string]any{
			"verification_state": p.VerificationState, "last_verified_at": p.LastVerifiedAt, "onboarding_state": p.OnboardingState,
			"business_name": p.BusinessName, "legal_name": p.LegalName, "support_email": p.SupportEmail, "support_phone": p.SupportPhone, "support_url": p.SupportURL, "business_address": p.BusinessAddress, "country": p.Country, "updated_at": now, "verification_lease_until": nil})
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return nil
		}
		// Only the winning successful retrieval may adopt an unbound legacy
		// mapping. Bind its provenance atomically with the verified status.
		r = tx.Model(&zeni.StripeOnboardingOperation{}).Where("community_id = ? AND platform_type = ? AND fence = ? AND platform_account_id = ''", p.CommunityID, p.PlatformType, claim.HeadFence).Updates(map[string]any{
			"platform_account_id": claim.Scope.PlatformAccountID, "live_mode": claim.Scope.LiveMode, "fingerprint": zeni.StripeOnboardingFingerprint, "account_id": p.PlatformAccountID, "fence": claim.HeadFence + 1, "state": "known"})
		if r.Error != nil {
			return r.Error
		}
		applied = true
		return nil
	})
	return applied && err == nil, err
}
