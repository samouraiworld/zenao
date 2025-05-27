package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetEventTickets(
	ctx context.Context,
	req *connect.Request[zenaov1.GetEventTicketsRequest],
) (*connect.Response[zenaov1.GetEventTicketsResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-event-tickets", zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	tickets, err := s.DB.GetEventUserTickets(req.Msg.EventId, zUser.ID)
	if err != nil {
		return nil, err
	}

	ticketsInfo := make([]*zenaov1.TicketInfo, len(tickets))
	for i, tk := range tickets {
		userEmail, err := s.Auth.GetUserFromID(ctx, tk.User.AuthID)
		if err != nil {
			return nil, err
		}
		ticketsInfo[i] = &zenaov1.TicketInfo{
			TicketSecret: tk.Ticket.Secret(),
			UserEmail:    userEmail.Email,
		}
	}

	return connect.NewResponse(&zenaov1.GetEventTicketsResponse{
		TicketsInfo: ticketsInfo,
	}), nil
}
