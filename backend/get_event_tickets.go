package main

import (
	"context"

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
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-event-tickets", zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	tickets, err := s.DB.WithContext(ctx).GetEventUserOrBuyerTickets(req.Msg.EventId, actor.ID())
	if err != nil {
		return nil, err
	}

	// Collect auth IDs of registered attendees; guests have no auth account and
	// carry their email directly on the DB user.
	authIDs := []string{}
	for _, tk := range tickets {
		if tk.User != nil && tk.User.AuthID != "" {
			authIDs = append(authIDs, tk.User.AuthID)
		}
	}

	authUsers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	if err != nil {
		return nil, err
	}
	emailByAuthID := make(map[string]string, len(authUsers))
	for _, u := range authUsers {
		emailByAuthID[u.ID] = u.Email
	}

	ticketsInfo := mapsl.Map(tickets, func(tk *zeni.SoldTicket) *zenaov1.TicketInfo {
		info := &zenaov1.TicketInfo{TicketSecret: tk.Ticket.Secret()}
		if tk.User == nil {
			return info
		}
		if tk.User.AuthID != "" {
			info.UserEmail = emailByAuthID[tk.User.AuthID]
		} else {
			info.UserEmail = tk.User.Email
		}
		return info
	})

	return connect.NewResponse(&zenaov1.GetEventTicketsResponse{
		TicketsInfo: ticketsInfo,
	}), nil
}
