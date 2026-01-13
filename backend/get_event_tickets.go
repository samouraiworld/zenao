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

	userIDs := []string{}
	ticketsWithUser := []*zeni.SoldTicket{}
	ticketsWithoutUser := []*zeni.SoldTicket{}

	for _, tk := range tickets {
		if tk.User == nil {
			ticketsWithoutUser = append(ticketsWithoutUser, tk)
			continue
		}
		userIDs = append(userIDs, tk.User.AuthID)
		ticketsWithUser = append(ticketsWithUser, tk)
	}

	users, err := s.Auth.GetUsersFromIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	ticketsInfo := mapsl.MapIndex(ticketsWithUser, func(i int, tk *zeni.SoldTicket) *zenaov1.TicketInfo {
		return &zenaov1.TicketInfo{TicketSecret: tk.Ticket.Secret(), UserEmail: users[i].Email}
	})
	ticketsInfo = append(ticketsInfo, mapsl.Map(ticketsWithoutUser, func(tk *zeni.SoldTicket) *zenaov1.TicketInfo {
		return &zenaov1.TicketInfo{TicketSecret: tk.Ticket.Secret()}
	})...)

	return connect.NewResponse(&zenaov1.GetEventTicketsResponse{
		TicketsInfo: ticketsInfo,
	}), nil
}
