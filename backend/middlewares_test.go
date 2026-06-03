package main

import (
	"context"
	"database/sql"
	"testing"

	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestEnsureUsersFromEmailsProvisionsGuests(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	auth := &ticketPaymentStubAuth{}
	// alice is registered, bob is not.
	auth.ensureAuthUser("alice@example.com")
	server := &ZenaoServer{Logger: zap.NewNop(), Auth: auth, DB: db}

	users, err := server.EnsureUsersFromEmails(context.Background(), []string{"alice@example.com", "bob@example.com"})
	require.NoError(t, err)
	require.Len(t, users, 2)

	// Registered user: tied to an auth account, no standalone email.
	alice := users["alice@example.com"]
	require.NotNil(t, alice)
	require.Equal(t, "auth-alice@example.com", alice.AuthID)

	// Guest user: no auth account, email stored on the DB user.
	bob := users["bob@example.com"]
	require.NotNil(t, bob)
	require.Empty(t, bob.AuthID)
	require.Equal(t, "bob@example.com", bob.Email)

	var authID sql.NullString
	var email sql.NullString
	require.NoError(t, sqlDB.QueryRow("SELECT auth_id, email FROM users WHERE id = ?", bob.ID).Scan(&authID, &email))
	require.False(t, authID.Valid)
	require.True(t, email.Valid)
	require.Equal(t, "bob@example.com", email.String)
}

func TestEnsureUserExistsPromotesGuest(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)
	auth := &ticketPaymentStubAuth{}
	server := &ZenaoServer{Logger: zap.NewNop(), Auth: auth, DB: db}

	// A guest checks out first.
	guest, err := db.CreateGuestUser("carol@example.com")
	require.NoError(t, err)
	require.Empty(t, guest.AuthID)

	// Carol later registers: the auth account must reuse the existing guest record
	// instead of creating a duplicate, keeping her past orders attached.
	authUser := &zeni.AuthUser{ID: "auth-carol", Email: "carol@example.com"}
	promoted, err := server.EnsureUserExists(context.Background(), authUser)
	require.NoError(t, err)
	require.Equal(t, guest.ID, promoted.ID)
	require.Equal(t, "auth-carol", promoted.AuthID)

	// The DB row is updated in place: auth_id set, standalone email cleared.
	var count int
	require.NoError(t, sqlDB.QueryRow("SELECT COUNT(*) FROM users WHERE auth_id = ? OR email = ?", "auth-carol", "carol@example.com").Scan(&count))
	require.Equal(t, 1, count)

	var authID sql.NullString
	var email sql.NullString
	require.NoError(t, sqlDB.QueryRow("SELECT auth_id, email FROM users WHERE id = ?", guest.ID).Scan(&authID, &email))
	require.True(t, authID.Valid)
	require.Equal(t, "auth-carol", authID.String)
	require.False(t, email.Valid)
}
