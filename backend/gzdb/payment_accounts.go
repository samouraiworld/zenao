package gzdb

import (
	"fmt"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type PaymentAccount struct {
	gorm.Model
	CommunityID       uint      `gorm:"not null;index:idx_payment_accounts_community_platform,unique"`
	Community         Community `gorm:"foreignKey:CommunityID"`
	PlatformType      string    `gorm:"not null;index:idx_payment_accounts_community_platform,unique"`
	PlatformAccountID string    `gorm:"not null"`
	OnboardingState   string    `gorm:"not null"`
	StartedAt         time.Time `gorm:"not null"`
}

func dbPaymentAccountToZeniPaymentAccount(dbAccount *PaymentAccount) *zeni.PaymentAccount {
	if dbAccount == nil {
		return nil
	}
	return &zeni.PaymentAccount{
		CreatedAt:         dbAccount.CreatedAt,
		UpdatedAt:         dbAccount.UpdatedAt,
		ID:                fmt.Sprintf("%d", dbAccount.ID),
		CommunityID:       fmt.Sprintf("%d", dbAccount.CommunityID),
		PlatformType:      dbAccount.PlatformType,
		PlatformAccountID: dbAccount.PlatformAccountID,
		OnboardingState:   dbAccount.OnboardingState,
		StartedAt:         dbAccount.StartedAt,
	}
}
