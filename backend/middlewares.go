package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
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

	var zUser *zeni.User
	if err := s.DB.TxWithSpan(ctx, "db.EnsureUserExists", func(db zeni.DB) error {
		var err error
		if zUser, err = db.GetUser(user.ID); err != nil {
			return err
		} else if zUser != nil {
			return nil
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

func (s *ZenaoServer) EnsureUsersFromEmails(
	ctx context.Context,
	emails []string,
) (map[string]*zeni.User, error) {
	authUsers, err := s.Auth.EnsureUsersExists(ctx, emails)
	if err != nil {
		return nil, err
	}

	if len(slices.Compact(authUsers)) != len(emails) {
		return nil, errors.New("duplicate email")
	}

	userIDs := make(map[string]*zeni.User, len(authUsers))
	for _, authUser := range authUsers {
		if authUser.Banned {
			return nil, fmt.Errorf("user %s is banned", authUser.Email)
		}
		user, err := s.EnsureUserExists(ctx, authUser)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return nil, errors.New("failed to create user")
		}
		normalizedEmail := strings.ToLower(strings.TrimSpace(authUser.Email))
		userIDs[normalizedEmail] = user
	}
	return userIDs, nil
}
