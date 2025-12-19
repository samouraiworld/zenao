package main

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// StoreTicketSecret implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) CreateTicketSecret(ctx context.Context, req *connect.Request[zenaov1.CreateTicketSecretRequest]) (*connect.Response[zenaov1.CreateTicketSecretResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("store ticket secret", zap.String("user-id", zUser.ID))

	ticket, err := zeni.NewTicket()
	if err != nil {
		return nil, fmt.Errorf("invalid secret: %w", err)
	}

	ownerID := zUser.ID
	if len(req.Msg.OwnerId) != 0 {
		ownerID = req.Msg.OwnerId
	}

	if err := s.DB.TxWithSpan(ctx, "store ticket secret", func(db zeni.DB) error {
		return db.StoreTicketSecret(req.Msg.EventAddress, ownerID, zUser.ID, ticket)
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateTicketSecretResponse{
		Secret:    ticket.Secret(),
		PublicKey: ticket.Pubkey(),
	}), nil
}
