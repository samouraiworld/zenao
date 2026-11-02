package gzdb

import "github.com/samouraiworld/zenao/backend/zeni"

// The runtime operation and Atlas model share the same columns and composite key.
type StripeOnboardingOperation struct {
	zeni.StripeOnboardingOperation `gorm:"embedded"`
	Community                      Community `gorm:"foreignKey:CommunityID"`
}

func (StripeOnboardingOperation) TableName() string { return "stripe_onboarding_operations" }
