package main

import (
	"context"
	"errors"

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
