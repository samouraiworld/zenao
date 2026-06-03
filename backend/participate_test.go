package main

import (
	"context"
	"database/sql"
	"testing"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// Participating in a free event without logging in must not create auth provider
// accounts for the buyer or the guests: they become DB-only guest users.
func TestParticipateProvisionsGuestsWithoutAuth(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)

	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{Logger: zap.NewNop(), Auth: organizerAuth, DB: db}
	if _, err := db.CreateUser(organizerAuth.user.ID); err != nil {
		require.NoError(t, err)
	}

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Free event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		}),
	)
	require.NoError(t, err)

	// Unauthenticated buyer (no GetUser, email provided) plus an unregistered guest.
	checkoutAuth := &ticketPaymentStubAuth{}
	server := &ZenaoServer{Logger: zap.NewNop(), Auth: checkoutAuth, DB: db}

	_, err = server.Participate(
		context.Background(),
		connect.NewRequest(&zenaov1.ParticipateRequest{
			EventId: createResp.Msg.Id,
			Email:   "alice@example.com",
			Guests:  []string{"bob@example.com"},
		}),
	)
	require.NoError(t, err)

	// Both attendees are guest users: email set, no auth_id.
	rows, err := sqlDB.Query("SELECT email, auth_id FROM users WHERE email IN (?, ?) ORDER BY email", "alice@example.com", "bob@example.com")
	require.NoError(t, err)
	t.Cleanup(func() { _ = rows.Close() })
	emails := []string{}
	for rows.Next() {
		var email sql.NullString
		var authID sql.NullString
		require.NoError(t, rows.Scan(&email, &authID))
		require.True(t, email.Valid)
		require.False(t, authID.Valid)
		emails = append(emails, email.String)
	}
	require.NoError(t, rows.Err())
	require.Equal(t, []string{"alice@example.com", "bob@example.com"}, emails)

	// Two tickets were issued for the event (buyer + guest).
	var ticketCount int
	require.NoError(t, sqlDB.QueryRow("SELECT COUNT(*) FROM sold_tickets WHERE event_id = ?", createResp.Msg.Id).Scan(&ticketCount))
	require.Equal(t, 2, ticketCount)
}

// A guest who is added to a free event and later registers must reuse the same
// user record instead of getting a duplicate.
func TestParticipateThenGuestRegistersReconciles(t *testing.T) {
	db, sqlDB := ztesting.SetupTestDB(t)

	organizerAuth := &ticketPaymentStubAuth{}
	organizerAuth.user = organizerAuth.ensureAuthUser("org@example.com")
	organizerServer := &ZenaoServer{Logger: zap.NewNop(), Auth: organizerAuth, DB: db}
	_, err := db.CreateUser(organizerAuth.user.ID)
	require.NoError(t, err)

	createResp, err := organizerServer.CreateEvent(
		context.Background(),
		connect.NewRequest(&zenaov1.CreateEventRequest{
			Title:       "Free event",
			Description: "test description",
			ImageUri:    "ipfs://image",
			StartDate:   1,
			EndDate:     2,
			Capacity:    100,
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Virtual{
					Virtual: &zenaov1.AddressVirtual{Uri: "https://example.com"},
				},
			},
		}),
	)
	require.NoError(t, err)

	checkoutAuth := &ticketPaymentStubAuth{}
	server := &ZenaoServer{Logger: zap.NewNop(), Auth: checkoutAuth, DB: db}

	_, err = server.Participate(
		context.Background(),
		connect.NewRequest(&zenaov1.ParticipateRequest{
			EventId: createResp.Msg.Id,
			Email:   "dave@example.com",
		}),
	)
	require.NoError(t, err)

	var guestID string
	require.NoError(t, sqlDB.QueryRow("SELECT id FROM users WHERE email = ?", "dave@example.com").Scan(&guestID))

	// Dave registers later: the guest record is promoted, not duplicated.
	authUser := checkoutAuth.ensureAuthUser("dave@example.com")
	promoted, err := server.EnsureUserExists(context.Background(), authUser)
	require.NoError(t, err)
	require.Equal(t, guestID, promoted.ID)

	var count int
	require.NoError(t, sqlDB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ? OR auth_id = ?", "dave@example.com", authUser.ID).Scan(&count))
	require.Equal(t, 1, count)
}
