package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"connectrpc.com/connect"
	_ "github.com/mattn/go-sqlite3"
	"github.com/samouraiworld/zenao/backend/gzdb"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

func TestDeriveVerificationState(t *testing.T) {
	tests := []struct {
		name     string
		account  *stripe.Account
		expected string
	}{
		{
			name: "verified",
			account: &stripe.Account{
				DetailsSubmitted: true,
				ChargesEnabled:   true,
				PayoutsEnabled:   true,
			},
			expected: zeni.PaymentVerificationStateVerified,
		},
		{
			name: "failed_rejected",
			account: &stripe.Account{
				ChargesEnabled: false,
				PayoutsEnabled: false,
				Requirements: &stripe.AccountRequirements{
					DisabledReason: "rejected.fraud",
				},
			},
			expected: zeni.PaymentVerificationStateFailed,
		},
		{
			name: "failed_disabled_reason_and_disabled",
			account: &stripe.Account{
				ChargesEnabled: false,
				PayoutsEnabled: false,
				Requirements: &stripe.AccountRequirements{
					DisabledReason: "requirements.past_due",
				},
			},
			expected: zeni.PaymentVerificationStateFailed,
		},
		{
			name: "pending_default",
			account: &stripe.Account{
				DetailsSubmitted: true,
				ChargesEnabled:   false,
				PayoutsEnabled:   false,
			},
			expected: zeni.PaymentVerificationStatePending,
		},
		{
			name:     "pending_nil",
			account:  nil,
			expected: zeni.PaymentVerificationStatePending,
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			require.Equal(t, test.expected, deriveStripeAccountVerificationState(test.account))
		})
	}
}

func TestShouldRefreshVerification(t *testing.T) {
	now := time.Date(2026, 1, 8, 10, 0, 0, 0, time.UTC)

	require.True(t, shouldRefreshStripeAccountVerification(nil, now, stripeAccountVerificationTTL))

	recent := now.Add(-2 * time.Minute)
	require.False(t, shouldRefreshStripeAccountVerification(&recent, now, stripeAccountVerificationTTL))

	expired := now.Add(-6 * time.Minute)
	require.True(t, shouldRefreshStripeAccountVerification(&expired, now, stripeAccountVerificationTTL))
}

type stubAuth struct {
	user *zeni.AuthUser
}

func (a *stubAuth) GetUser(ctx context.Context) *zeni.AuthUser {
	return a.user
}

func (a *stubAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	return nil, errors.New("not implemented")
}

func (a *stubAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	return nil, errors.New("not implemented")
}

func (a *stubAuth) EnsureUsersExists(ctx context.Context, emails []string) ([]*zeni.AuthUser, error) {
	return nil, errors.New("not implemented")
}

func (a *stubAuth) WithAuth() func(http.Handler) http.Handler {
	return func(handler http.Handler) http.Handler { return handler }
}

func applyMigrations(t *testing.T, migrationsDir string, db *sql.DB) {
	t.Helper()

	entries, err := os.ReadDir(migrationsDir)
	require.NoError(t, err)

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, filepath.Join(migrationsDir, entry.Name()))
	}
	sort.Strings(files)

	for _, path := range files {
		contents, err := os.ReadFile(path)
		require.NoError(t, err)
		if strings.TrimSpace(string(contents)) == "" {
			continue
		}
		_, err = db.Exec(string(contents))
		require.NoErrorf(t, err, "apply migration %s", path)
	}
}

func setupTestDB(t *testing.T) zeni.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	migrationsDir := filepath.Join("..", "migrations")
	if _, err := os.Stat(migrationsDir); err != nil {
		migrationsDir = "migrations"
	}
	applyMigrations(t, migrationsDir, sqlDB)

	db, err := gzdb.SetupDB(dbPath)
	require.NoError(t, err)
	return db
}

func TestGetCommunityPayoutStatusStripeErrorPreservesState(t *testing.T) {
	db := setupTestDB(t)
	auth := &stubAuth{user: &zeni.AuthUser{ID: "auth-user"}}
	server := &ZenaoServer{
		Logger:          zap.NewNop(),
		Auth:            auth,
		DB:              db,
		StripeSecretKey: "sk_test",
	}

	user, err := db.CreateUser(auth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test"},
	)
	require.NoError(t, err)

	lastVerifiedAt := time.Date(2026, 1, 8, 9, 0, 0, 0, time.UTC)
	_, err = db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_123",
		OnboardingState:   zeni.PaymentOnboardingStateStarted,
		StartedAt:         time.Now().UTC(),
		VerificationState: "pending",
		LastVerifiedAt:    &lastVerifiedAt,
	})
	require.NoError(t, err)

	originalStripeGet := stripeAccountGetByID
	stripeAccountGetByID = func(id string, params *stripe.AccountParams) (*stripe.Account, error) {
		return nil, errors.New("stripe unavailable")
	}
	t.Cleanup(func() { stripeAccountGetByID = originalStripeGet })

	resp, err := server.GetCommunityPayoutStatus(
		context.Background(),
		connect.NewRequest(&zenaov1.GetCommunityPayoutStatusRequest{
			CommunityId: community.ID,
		}),
	)
	require.NoError(t, err)
	require.Equal(t, zeni.PaymentVerificationStatePending, resp.Msg.VerificationState)
	require.Equal(t, lastVerifiedAt.Unix(), resp.Msg.LastVerifiedAt)
	require.True(t, resp.Msg.IsStale)
	require.Contains(t, resp.Msg.RefreshError, "stripe unavailable")
	require.Equal(t, zeni.PaymentOnboardingStateStarted, resp.Msg.OnboardingState)
	require.Equal(t, "acct_123", resp.Msg.PlatformAccountId)
	require.ElementsMatch(t, zeni.ListSupportedStripeCurrencies(), resp.Msg.Currencies)
}

func TestGetCommunityPayoutStatusStripeSuccessUpdatesState(t *testing.T) {
	db := setupTestDB(t)
	auth := &stubAuth{user: &zeni.AuthUser{ID: "auth-user"}}
	server := &ZenaoServer{
		Logger:          zap.NewNop(),
		Auth:            auth,
		DB:              db,
		StripeSecretKey: "sk_test",
	}

	user, err := db.CreateUser(auth.user.ID)
	require.NoError(t, err)

	community, err := db.CreateCommunity(
		user.ID,
		[]string{user.ID},
		[]string{},
		[]string{},
		&zenaov1.CreateCommunityRequest{DisplayName: "Test"},
	)
	require.NoError(t, err)

	staleVerifiedAt := time.Date(2026, 1, 8, 7, 0, 0, 0, time.UTC)
	_, err = db.UpsertPaymentAccount(&zeni.PaymentAccount{
		CommunityID:       community.ID,
		PlatformType:      zeni.PaymentPlatformStripeConnect,
		PlatformAccountID: "acct_123",
		OnboardingState:   zeni.PaymentOnboardingStateStarted,
		StartedAt:         time.Now().UTC(),
		VerificationState: "pending",
		LastVerifiedAt:    &staleVerifiedAt,
	})
	require.NoError(t, err)

	originalStripeGet := stripeAccountGetByID
	stripeAccountGetByID = func(id string, params *stripe.AccountParams) (*stripe.Account, error) {
		return &stripe.Account{
			DetailsSubmitted: true,
			ChargesEnabled:   true,
			PayoutsEnabled:   true,
		}, nil
	}
	t.Cleanup(func() { stripeAccountGetByID = originalStripeGet })

	resp, err := server.GetCommunityPayoutStatus(
		context.Background(),
		connect.NewRequest(&zenaov1.GetCommunityPayoutStatusRequest{
			CommunityId: community.ID,
		}),
	)
	require.NoError(t, err)
	require.Equal(t, zeni.PaymentVerificationStateVerified, resp.Msg.VerificationState)
	require.False(t, resp.Msg.IsStale)
	require.Equal(t, zeni.PaymentOnboardingStateCompleted, resp.Msg.OnboardingState)
	require.True(t, resp.Msg.LastVerifiedAt > 0)
	require.Equal(t, "acct_123", resp.Msg.PlatformAccountId)
	require.ElementsMatch(t, zeni.ListSupportedStripeCurrencies(), resp.Msg.Currencies)
}
