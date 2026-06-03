package main

import (
	"context"
	"errors"
	"strings"

	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EnsureUserExists(
	ctx context.Context,
	user *zeni.AuthUser,
) (*zeni.User, error) {
	spanCtx, span := otel.Tracer("zenao-server").Start(
		ctx,
		"zs.EnsureUserExists",
		trace.WithSpanKind(trace.SpanKindClient),
	)
	defer span.End()
	ctx = spanCtx

	if user == nil {
		return nil, errors.New("nil user")
	}

	s.Logger.Info("create-user", zap.String("user-id", user.ID))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(user.Email))

	var zUser *zeni.User
	if err := s.DB.TxWithSpan(ctx, "db.EnsureUserExists", func(db zeni.DB) error {
		var err error
		if zUser, err = db.GetUser(user.ID); err != nil {
			return err
		} else if zUser != nil {
			return nil
		}
		// Reconcile a prior guest checkout: if a guest user already exists for this
		// email, link it to the auth account instead of creating a duplicate. This
		// keeps the guest's past orders and tickets attached to the same user.
		if normalizedEmail != "" {
			guest, err := db.GetUserByEmail(normalizedEmail)
			if err != nil {
				return err
			}
			if guest != nil {
				zUser, err = db.PromoteGuestUser(guest.ID, user.ID)
				return err
			}
		}
		if zUser, err = db.CreateUser(user.ID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return zUser, nil
}

// EnsureGuestUser returns the DB user for a guest email, creating a guest user
// (no auth provider account) when none exists yet.
func (s *ZenaoServer) EnsureGuestUser(
	ctx context.Context,
	email string,
) (*zeni.User, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, errors.New("email is required")
	}

	var zUser *zeni.User
	if err := s.DB.TxWithSpan(ctx, "db.EnsureGuestUser", func(db zeni.DB) error {
		var err error
		if zUser, err = db.GetUserByEmail(normalizedEmail); err != nil {
			return err
		} else if zUser != nil {
			return nil
		}
		zUser, err = db.CreateGuestUser(normalizedEmail)
		return err
	}); err != nil {
		return nil, err
	}

	return zUser, nil
}

// EnsureUsersFromEmails resolves a DB user for each email without provisioning an
// auth provider account for addresses that are not registered yet. Registered
// emails reuse their auth account; the rest become guest users. The result is
// keyed by normalized (lowercased) email.
func (s *ZenaoServer) EnsureUsersFromEmails(
	ctx context.Context,
	emails []string,
) (map[string]*zeni.User, error) {
	normalized := make([]string, len(emails))
	seen := make(map[string]struct{}, len(emails))
	for i, email := range emails {
		n := strings.ToLower(strings.TrimSpace(email))
		if n == "" {
			return nil, errors.New("email is required")
		}
		if _, dup := seen[n]; dup {
			return nil, errors.New("duplicate email")
		}
		seen[n] = struct{}{}
		normalized[i] = n
	}

	// Lookup only: never create auth accounts here, otherwise every guest email
	// would consume an auth provider seat.
	authUsers, err := s.Auth.GetUsersFromEmails(ctx, normalized)
	if err != nil {
		return nil, err
	}

	result := make(map[string]*zeni.User, len(normalized))
	for _, email := range normalized {
		if authUser, ok := authUsers[email]; ok {
			user, err := s.EnsureUserExists(ctx, authUser)
			if err != nil {
				return nil, err
			}
			if user == nil {
				return nil, errors.New("failed to resolve user")
			}
			result[email] = user
			continue
		}

		user, err := s.EnsureGuestUser(ctx, email)
		if err != nil {
			return nil, err
		}
		result[email] = user
	}

	return result, nil
}
