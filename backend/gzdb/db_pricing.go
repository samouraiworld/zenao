package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetPaymentAccountByCommunityPlatform implements zeni.DB.
func (g *gormZenaoDB) GetPaymentAccountByCommunityPlatform(communityID string, platformType string) (*zeni.PaymentAccount, error) {
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse community id: %w", err)
	}

	var account PaymentAccount
	if err := g.db.Where("community_id = ? AND platform_type = ?", communityIDInt, platformType).First(&account).Error; err != nil {
		return nil, err
	}

	return dbPaymentAccountToZeniPaymentAccount(&account), nil
}

// UpsertPaymentAccount implements zeni.DB.
func (g *gormZenaoDB) UpsertPaymentAccount(account *zeni.PaymentAccount) (*zeni.PaymentAccount, error) {
	if account == nil {
		return nil, errors.New("payment account is nil")
	}

	communityIDInt, err := strconv.ParseUint(account.CommunityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse community id: %w", err)
	}

	newAccount := PaymentAccount{
		CommunityID:       uint(communityIDInt),
		PlatformType:      account.PlatformType,
		PlatformAccountID: account.PlatformAccountID,
		OnboardingState:   account.OnboardingState,
		StartedAt:         account.StartedAt,
		VerificationState: account.VerificationState,
		LastVerifiedAt:    account.LastVerifiedAt,
	}

	now := time.Now().UTC()
	err = g.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "community_id"},
			{Name: "platform_type"},
		},
		DoUpdates: clause.Assignments(map[string]any{
			"platform_account_id": account.PlatformAccountID,
			"onboarding_state":    account.OnboardingState,
			"started_at":          account.StartedAt,
			"verification_state":  account.VerificationState,
			"last_verified_at":    account.LastVerifiedAt,
			"updated_at":          now,
		}),
	}).Create(&newAccount).Error

	return dbPaymentAccountToZeniPaymentAccount(&newAccount), err
}

// CreatePriceGroup implements zeni.DB.
func (g *gormZenaoDB) CreatePriceGroup(eventID string, capacity uint32) (*zeni.PriceGroup, error) {
	g, span := g.trace("gzdb.CreatePriceGroup")
	defer span.End()

	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}

	group := &PriceGroup{
		EventID:  uint(eventIDInt),
		Capacity: capacity,
	}
	if err := g.db.Create(group).Error; err != nil {
		return nil, fmt.Errorf("create price group: %w", err)
	}

	return dbPriceGroupToZeniPriceGroup(group), nil
}

func (g *gormZenaoDB) getPriceGroupsByEvent(eventIDInt uint64) ([]PriceGroup, error) {
	var groups []PriceGroup
	if err := g.db.
		Where("event_id = ?", eventIDInt).
		Preload("Prices", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Preload("Prices.PaymentAccount").
		Order("id ASC").
		Find(&groups).Error; err != nil {
		return nil, fmt.Errorf("query price groups: %w", err)
	}

	return groups, nil
}

// GetPriceGroupsByEvent implements zeni.DB.
func (g *gormZenaoDB) GetPriceGroupsByEvent(eventID string) ([]*zeni.PriceGroup, error) {
	g, span := g.trace("gzdb.GetPriceGroupsByEvent")
	defer span.End()

	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}

	groups, err := g.getPriceGroupsByEvent(eventIDInt)
	if err != nil {
		return nil, err
	}

	result := make([]*zeni.PriceGroup, 0, len(groups))
	for _, group := range groups {
		result = append(result, dbPriceGroupToZeniPriceGroup(&group))
	}
	return result, nil
}

// UpdatePriceGroupCapacity implements zeni.DB.
func (g *gormZenaoDB) UpdatePriceGroupCapacity(priceGroupID string, capacity uint32) error {
	g, span := g.trace("gzdb.UpdatePriceGroupCapacity")
	defer span.End()

	priceGroupIDInt, err := strconv.ParseUint(priceGroupID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse price group id: %w", err)
	}

	res := g.db.Model(&PriceGroup{}).Where("id = ?", priceGroupIDInt).Updates(map[string]any{
		"capacity":   capacity,
		"updated_at": time.Now().UTC(),
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("price group not found")
	}
	return nil
}

// CreatePrice implements zeni.DB.
func (g *gormZenaoDB) CreatePrice(paymentAccount *zeni.PaymentAccount, price *zeni.Price) (*zeni.Price, error) {
	g, span := g.trace("gzdb.CreatePrice")
	defer span.End()

	if price == nil {
		return nil, errors.New("price is nil")
	}

	priceGroupIDInt, err := strconv.ParseUint(price.PriceGroupID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse price group id: %w", err)
	}

	paymentAccountID, err := g.validatePaymentAccountID(paymentAccount, price)
	if err != nil {
		return nil, err
	}

	if err := validateAmount(price, paymentAccountID); err != nil {
		return nil, err
	}

	dbPrice := &Price{
		PriceGroupID:     uint(priceGroupIDInt),
		AmountMinor:      price.AmountMinor,
		CurrencyCode:     price.CurrencyCode,
		PaymentAccountID: paymentAccountID,
	}

	if err := g.db.Create(dbPrice).Error; err != nil {
		return nil, fmt.Errorf("create price: %w", err)
	}

	return dbPriceToZeniPrice(dbPrice), nil
}

func (g *gormZenaoDB) validatePaymentAccountID(paymentAccount *zeni.PaymentAccount, price *zeni.Price) (*uint, error) {
	if paymentAccount == nil {
		if price.PaymentAccountID == "" {
			return nil, nil
		}

		return nil, errors.New(
			"payment account id is required when payment account is not provided",
		)
	}

	if paymentAccount.ID != price.PaymentAccountID {
		return nil, errors.New("payment account id does not match")
	}

	var paymentAccountID *uint
	if price.PaymentAccountID != "" {
		paymentAccountIDInt, err := strconv.ParseUint(price.PaymentAccountID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse payment account id: %w", err)
		}
		pid := uint(paymentAccountIDInt)
		paymentAccountID = &pid
	}

	if paymentAccountID == nil {
		return nil, nil
	}

	currency := strings.ToUpper(strings.TrimSpace(price.CurrencyCode))
	if currency == "" {
		return nil, errors.New("currency is required for payment account")
	}
	switch paymentAccount.PlatformType {
	case zeni.PaymentPlatformStripeConnect:
		if paymentAccount.VerificationState != zeni.PaymentVerificationStateVerified ||
			paymentAccount.OnboardingState != zeni.PaymentOnboardingStateCompleted {
			return nil, errors.New("payment account is not verified")
		}

		if !zeni.IsSupportedStripeCurrency(currency) {
			return nil, errors.New("unsupported currency")
		}
	default:
		return nil, fmt.Errorf("unsupported payment platform: %s", paymentAccount.PlatformType)
	}

	return paymentAccountID, nil
}

func validateAmount(price *zeni.Price, paymentAccountID *uint) error {
	if price.AmountMinor < 0 {
		return errors.New("amount minor cannot be negative")
	}

	if price.AmountMinor == 0 && paymentAccountID != nil {
		return errors.New("amount minor is required when payment account id is provided")
	} else if price.AmountMinor != 0 && paymentAccountID == nil {
		return errors.New("payment account id is required when amount minor is provided")
	}

	return nil
}

// UpdatePrice implements zeni.DB.
func (g *gormZenaoDB) UpdatePrice(paymentAccount *zeni.PaymentAccount, price *zeni.Price) error {
	g, span := g.trace("gzdb.UpdatePrice")
	defer span.End()

	if price == nil {
		return errors.New("price is nil")
	}
	if price.ID == "" {
		return errors.New("price id is required")
	}

	priceIDInt, err := strconv.ParseUint(price.ID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse price id: %w", err)
	}

	paymentAccountID, err := g.validatePaymentAccountID(paymentAccount, price)
	if err != nil {
		return err
	}

	if err := validateAmount(price, paymentAccountID); err != nil {
		return err
	}

	res := g.db.Model(&Price{}).Where("id = ?", priceIDInt).Updates(map[string]any{
		"amount_minor":       price.AmountMinor,
		"currency_code":      price.CurrencyCode,
		"payment_account_id": paymentAccountID,
		"updated_at":         time.Now().UTC(),
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("price not found")
	}
	return nil
}
