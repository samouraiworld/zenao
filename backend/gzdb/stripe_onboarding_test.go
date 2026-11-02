package gzdb_test

import (
	"context"
	"database/sql"
	"strconv"
	"sync"
	"testing"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/samouraiworld/zenao/migrations"
	"github.com/stretchr/testify/require"
)

func operationFixture(t *testing.T) (zeni.DB, *sql.DB, zeni.StripeOnboardingScope) {
	t.Helper()
	db, raw := ztesting.SetupTestDB(t)
	u, e := db.CreateUser("op-admin")
	require.NoError(t, e)
	c, e := db.CreateCommunity(u.ID, []string{u.ID}, nil, nil, &zenaov1.CreateCommunityRequest{DisplayName: "Operations"})
	require.NoError(t, e)
	return db, raw, zeni.StripeOnboardingScope{CommunityID: c.ID, ActorID: u.ID, PlatformAccountID: "acct_owner", LiveMode: true}
}

func TestStripeOperationGlobalScopeAndImmutableReplayClock(t *testing.T) {
	db, _, scope := operationFixture(t)
	now := time.Now().UTC()
	a, e := db.ClaimStripeOnboarding(scope, "", now)
	require.NoError(t, e)
	require.NoError(t, db.FinishStripeOnboarding(a, "unknown", now))
	other := scope
	other.PlatformAccountID = "acct_different"
	_, e = db.ClaimStripeOnboarding(other, "", now)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	other = scope
	other.LiveMode = false
	_, e = db.ClaimStripeOnboarding(other, "", now)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	b, e := db.ClaimStripeOnboarding(scope, "", now.Add(time.Hour))
	require.NoError(t, e)
	require.Equal(t, a.IdempotencyKey, b.IdempotencyKey)
	require.True(t, a.FirstAttemptAt.Equal(*b.FirstAttemptAt))
	require.NoError(t, db.FinishStripeOnboarding(b, "unknown", now.Add(time.Hour)))
	_, e = db.ClaimStripeOnboarding(scope, "", now.Add(zeni.StripeOnboardingReplayWindow))
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	_, e = db.ClaimStripeOnboarding(scope, "", now.Add(-time.Hour))
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
}

func TestStripeOperationMissingAttemptClockFailsClosed(t *testing.T) {
	db, raw, scope := operationFixture(t)
	now := time.Now().UTC()
	op, e := db.ClaimStripeOnboarding(scope, "", now)
	require.NoError(t, e)
	require.NoError(t, db.FinishStripeOnboarding(op, "unknown", now))
	_, e = raw.Exec("UPDATE stripe_onboarding_operations SET first_attempt_at=NULL WHERE community_id=?", scope.CommunityID)
	require.NoError(t, e)
	_, e = db.ClaimStripeOnboarding(scope, "", now.Add(time.Hour))
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	var key string
	var first *time.Time
	require.NoError(t, raw.QueryRow("SELECT idempotency_key,first_attempt_at FROM stripe_onboarding_operations WHERE community_id=?", scope.CommunityID).Scan(&key, &first))
	require.Equal(t, op.IdempotencyKey, key)
	require.Nil(t, first)
}

func TestStripeOperationFencesLateCompletionAndAtomicallyPersistsMapping(t *testing.T) {
	db, raw, scope := operationFixture(t)
	now := time.Now().UTC()
	a, e := db.ClaimStripeOnboarding(scope, "", now)
	require.NoError(t, e)
	b, e := db.ClaimStripeOnboarding(scope, "", now.Add(zeni.StripeOnboardingLease))
	require.NoError(t, e)
	require.ErrorIs(t, db.CompleteStripeOnboardingAccount(a, "acct_old", now.Add(zeni.StripeOnboardingLease)), zeni.ErrOnboardingFence)
	require.ErrorIs(t, db.FinishStripeOnboarding(a, "known", now.Add(zeni.StripeOnboardingLease)), zeni.ErrOnboardingFence)
	_, e = raw.Exec("CREATE TRIGGER reject_test_mapping BEFORE INSERT ON payment_accounts BEGIN SELECT RAISE(ABORT, 'injected persistence failure'); END")
	require.NoError(t, e)
	require.Error(t, db.CompleteStripeOnboardingAccount(b, "acct_seller", now.Add(zeni.StripeOnboardingLease)))
	var accountID string
	require.NoError(t, raw.QueryRow("SELECT account_id FROM stripe_onboarding_operations WHERE community_id=?", scope.CommunityID).Scan(&accountID))
	require.Empty(t, accountID)
	_, e = raw.Exec("DROP TRIGGER reject_test_mapping")
	require.NoError(t, e)
	require.NoError(t, db.CompleteStripeOnboardingAccount(b, "acct_seller", now.Add(zeni.StripeOnboardingLease)))
	p, e := db.GetPaymentAccountByCommunityPlatform(scope.CommunityID, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, "acct_seller", p.PlatformAccountID)
	p.PlatformAccountID = "acct_replacement"
	_, e = db.UpsertPaymentAccount(p)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
}

func TestStripeOperationConcurrentClaimsHaveSingleWinner(t *testing.T) {
	db, _, scope := operationFixture(t)
	now := time.Now().UTC()
	var wg sync.WaitGroup
	var mu sync.Mutex
	wins := 0
	keys := make(chan string, 12)
	for range 12 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c, e := db.WithContext(context.Background()).ClaimStripeOnboarding(scope, "", now)
			if e == nil {
				mu.Lock()
				wins++
				mu.Unlock()
				keys <- c.IdempotencyKey
			}
		}()
	}
	wg.Wait()
	close(keys)
	require.Equal(t, 1, wins)
	for key := range keys {
		require.NotEmpty(t, key)
	}
}

func TestStripeVerificationCannotCompleteAcrossHeadFenceOrExpiredLease(t *testing.T) {
	db, _, scope := operationFixture(t)
	now := time.Now().UTC()
	op, e := db.ClaimStripeOnboarding(scope, "", now)
	require.NoError(t, e)
	require.NoError(t, db.CompleteStripeOnboardingAccount(op, "acct_seller", now))
	require.NoError(t, db.FinishStripeOnboarding(op, "known", now))
	p, e := db.GetPaymentAccountByCommunityPlatform(scope.CommunityID, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	claim, e := db.BeginPaymentAccountVerification(p, scope, now)
	require.NoError(t, e)
	_, e = db.ClaimStripeOnboarding(scope, "acct_seller", now)
	require.NoError(t, e)
	p.VerificationState = zeni.PaymentVerificationStateVerified
	applied, e := db.CompletePaymentAccountVerification(p, claim, now)
	require.NoError(t, e)
	require.False(t, applied)
	claim, e = db.BeginPaymentAccountVerification(p, scope, now)
	require.NoError(t, e)
	applied, e = db.CompletePaymentAccountVerification(p, claim, now.Add(zeni.StripeOnboardingLease))
	require.NoError(t, e)
	require.False(t, applied)
	stored, e := db.GetPaymentAccountByCommunityPlatform(scope.CommunityID, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, zeni.PaymentVerificationStatePending, stored.VerificationState)
}

func TestStripeMigrationBlocksUnmappedLegacyAndPreservesExistingRows(t *testing.T) {
	// Apply the real additive migration to a minimum pre-migration SQLite fixture.
	db, e := sql.Open("sqlite3", ":memory:")
	require.NoError(t, e)
	defer db.Close()
	db.SetMaxOpenConns(1)
	_, e = db.Exec("CREATE TABLE communities(id integer PRIMARY KEY); CREATE TABLE payment_accounts(id integer PRIMARY KEY,community_id integer,platform_type text,platform_account_id text); INSERT INTO communities VALUES(1),(2); INSERT INTO payment_accounts VALUES(7,1,'stripe_connect','acct_preserved')")
	require.NoError(t, e)
	_, e = db.Exec("PRAGMA foreign_keys=ON; CREATE TABLE orders(id text PRIMARY KEY,payment_account_id integer REFERENCES payment_accounts(id)); CREATE TABLE prices(id integer PRIMARY KEY,payment_account_id integer REFERENCES payment_accounts(id)); INSERT INTO orders VALUES('historic-order',7); INSERT INTO prices VALUES(9,7)")
	require.NoError(t, e)
	m, e := migrations.Migrations.ReadFile("20261102120000_durable_stripe_onboarding.sql")
	require.NoError(t, e)
	_, e = db.Exec(string(m))
	require.NoError(t, e)
	var blocked int
	require.NoError(t, db.QueryRow("SELECT count(*) FROM stripe_onboarding_operations WHERE state='legacy_blocked'").Scan(&blocked))
	require.Equal(t, 2, blocked)
	var unmapped int
	require.NoError(t, db.QueryRow("SELECT count(*) FROM stripe_onboarding_operations WHERE state='legacy_blocked' AND account_id=''").Scan(&unmapped))
	require.Equal(t, 1, unmapped)
	var id int
	var account string
	require.NoError(t, db.QueryRow("SELECT id,platform_account_id FROM payment_accounts").Scan(&id, &account))
	require.Equal(t, 7, id)
	require.Equal(t, "acct_preserved", account)
	var references int
	require.NoError(t, db.QueryRow("SELECT (SELECT count(*) FROM orders o JOIN payment_accounts p ON p.id=o.payment_account_id WHERE p.id=7 AND p.platform_account_id='acct_preserved') + (SELECT count(*) FROM prices v JOIN payment_accounts p ON p.id=v.payment_account_id WHERE p.id=7 AND p.platform_account_id='acct_preserved')").Scan(&references))
	require.Equal(t, 2, references)
	var unknown string
	require.NoError(t, db.QueryRow("SELECT account_id FROM stripe_onboarding_operations WHERE community_id=2").Scan(&unknown))
	require.Empty(t, unknown)
}

func TestStripeLegacyVerificationBindingRollsBackWithStatusOnFailure(t *testing.T) {
	db, raw, scope := operationFixture(t)
	now := time.Now().UTC()
	p, e := db.UpsertPaymentAccount(&zeni.PaymentAccount{CommunityID: scope.CommunityID, PlatformType: zeni.PaymentPlatformStripeConnect, PlatformAccountID: "acct_legacy", OnboardingState: zeni.PaymentOnboardingStateStarted, StartedAt: now, VerificationState: zeni.PaymentVerificationStatePending})
	require.NoError(t, e)
	claim, e := db.BeginPaymentAccountVerification(p, scope, now)
	require.NoError(t, e)
	_, e = raw.Exec("CREATE TRIGGER reject_scope_binding BEFORE UPDATE ON stripe_onboarding_operations BEGIN SELECT RAISE(ABORT, 'injected binding failure'); END")
	require.NoError(t, e)
	p.VerificationState = zeni.PaymentVerificationStateVerified
	applied, e := db.CompletePaymentAccountVerification(p, claim, now)
	require.Error(t, e)
	require.False(t, applied)
	stored, e := db.GetPaymentAccountByCommunityPlatform(scope.CommunityID, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, zeni.PaymentVerificationStatePending, stored.VerificationState)
	var owner string
	require.NoError(t, raw.QueryRow("SELECT platform_account_id FROM stripe_onboarding_operations WHERE community_id=?", scope.CommunityID).Scan(&owner))
	require.Empty(t, owner)
}

func TestStripeLegacyRequiresDispositionButKnownMappingCanBeVerifiedAdopted(t *testing.T) {
	db, raw, scope := operationFixture(t)
	now := time.Now().UTC()
	id, e := strconv.Atoi(scope.CommunityID)
	require.NoError(t, e)
	_, e = raw.Exec("INSERT INTO stripe_onboarding_operations(community_id,platform_type,state,lease_until) VALUES(?,'stripe_connect','legacy_blocked','1970-01-01')", id)
	require.NoError(t, e)
	_, e = db.ClaimStripeOnboarding(scope, "", now)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	_, e = db.UpsertPaymentAccount(&zeni.PaymentAccount{CommunityID: scope.CommunityID, PlatformType: zeni.PaymentPlatformStripeConnect, PlatformAccountID: "acct_existing", StartedAt: now, OnboardingState: zeni.PaymentOnboardingStateStarted})
	require.NoError(t, e)
	_, e = db.ClaimStripeOnboarding(scope, "", now)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	c, e := db.ClaimStripeOnboarding(scope, "acct_existing", now)
	require.NoError(t, e)
	require.Equal(t, "acct_existing", c.AccountID)
	require.Nil(t, c.FirstAttemptAt)
}
