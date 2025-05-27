package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
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

	// map userids to do a single auth service roundtrip
	userIds := mapsl.Map(tickets, func(_ int, tk *zeni.SoldTicket) string { return tk.User.AuthID })
	users, err := s.Auth.GetUsersFromIDs(ctx, userIds)
	if err != nil {
		return nil, err
	}

	ticketsInfo := mapsl.Map(tickets, func(i int, tk *zeni.SoldTicket) *zenaov1.TicketInfo {
		return &zenaov1.TicketInfo{
			TicketSecret: tk.Ticket.Secret(),
			UserEmail:    users[i].Email,
		}
	})

	return connect.NewResponse(&zenaov1.GetEventTicketsResponse{
		TicketsInfo: ticketsInfo,
	}), nil
}
