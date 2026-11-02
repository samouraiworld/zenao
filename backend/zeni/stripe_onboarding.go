package zeni

import (
	"errors"
	"time"
)

var (
	ErrOnboardingBusy           = errors.New("payment onboarding is already in progress")
	ErrOnboardingReconciliation = errors.New("payment onboarding requires account reconciliation")
	ErrOnboardingFence          = errors.New("payment onboarding changed; read current state before retrying")
	ErrOnboardingUnauthorized   = errors.New("you must be an administrator of the community to start onboarding")
)

const StripeOnboardingFingerprint = "standard:card_payments:transfers:v1"
const StripeOnboardingLease = 30 * time.Second
const StripeOnboardingReplayWindow = 23 * time.Hour

// The credential identity is non-secret and immutable for an operation.
// ActorID is checked at claim time and is not part of the persisted identity.
type StripeOnboardingScope struct {
	CommunityID       string
	ActorID           string
	PlatformAccountID string
	LiveMode          bool
}

// A row is globally unique per community/provider, not per credential or mode.
// No automatic path replaces a previous operation or its first-attempt clock.
type StripeOnboardingOperation struct {
	CommunityID       uint   `gorm:"primaryKey;autoIncrement:false;not null"`
	PlatformType      string `gorm:"primaryKey;not null"`
	OperationID       string `gorm:"not null;default:''"`
	PlatformAccountID string `gorm:"not null;default:''"`
	LiveMode          bool   `gorm:"not null;default:0"`
	Fingerprint       string `gorm:"not null;default:''"`
	IdempotencyKey    string `gorm:"not null;default:''"`
	State             string `gorm:"not null"`
	FirstAttemptAt    *time.Time
	Fence             uint64    `gorm:"not null;default:0"`
	LeaseUntil        time.Time `gorm:"not null"`
	AccountID         string    `gorm:"not null;default:''"`
}

func (StripeOnboardingOperation) TableName() string { return "stripe_onboarding_operations" }

// Verification has its own request generation and observes one global head fence.
type PaymentAccountVerificationClaim struct {
	Generation uint64
	HeadFence  uint64
	Scope      StripeOnboardingScope
}
