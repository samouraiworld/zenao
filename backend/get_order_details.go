package main

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetOrderDetails(
	ctx context.Context,
	req *connect.Request[zenaov1.GetOrderDetailsRequest],
) (*connect.Response[zenaov1.GetOrderDetailsResponse], error) {
	if req == nil || req.Msg == nil || strings.TrimSpace(req.Msg.OrderId) == "" {
		return nil, errors.New("order id is required")
	}

	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	orderID := strings.TrimSpace(req.Msg.OrderId)
	s.Logger.Info("get-order-details",
		zap.String("order-id", orderID),
		zap.String("actor-id", actor.ID()),
		zap.Bool("acting-as-team", actor.IsTeam()),
	)

	order, err := s.DB.GetOrder(orderID)
	if err != nil {
		return nil, err
	}
	if order == nil || actor.ID() != order.BuyerID {
		return nil, errors.New("order not found")
	}

	tickets, err := s.DB.GetOrderTickets(orderID)
	if err != nil {
		return nil, err
	}

	attendees, err := s.DB.GetOrderAttendees(orderID)
	if err != nil {
		return nil, err
	}

	// Order attendees only carry the internal DB user id, so resolve it to the
	// auth id used to look up emails. Tickets already preload the auth id.
	attendeeUserIDs := make([]string, 0, len(attendees))
	for _, attendee := range attendees {
		if attendee == nil || strings.TrimSpace(attendee.UserID) == "" {
			continue
		}
		attendeeUserIDs = append(attendeeUserIDs, attendee.UserID)
	}
	attendeeUsers, err := s.DB.GetUsersByIDs(attendeeUserIDs)
	if err != nil {
		return nil, err
	}
	authIDByUserID := map[string]string{}
	for _, user := range attendeeUsers {
		if user != nil {
			authIDByUserID[user.ID] = user.AuthID
		}
	}

	emailsByID := map[string]string{}
	authIDsSet := map[string]struct{}{}
	for _, ticket := range tickets {
		if ticket == nil || ticket.User == nil || strings.TrimSpace(ticket.User.AuthID) == "" {
			continue
		}
		authIDsSet[ticket.User.AuthID] = struct{}{}
	}
	for _, authID := range authIDByUserID {
		if strings.TrimSpace(authID) == "" {
			continue
		}
		authIDsSet[authID] = struct{}{}
	}
	authIDs := make([]string, 0, len(authIDsSet))
	for authID := range authIDsSet {
		authIDs = append(authIDs, authID)
	}

	users, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	if err != nil {
		return nil, err
	}
	for _, user := range users {
		if user != nil {
			emailsByID[user.ID] = user.Email
		}
	}

	ticketInfos := make([]*zenaov1.OrderTicketInfo, 0, len(tickets))
	for _, ticket := range tickets {
		if ticket == nil {
			continue
		}

		ticketInfo := &zenaov1.OrderTicketInfo{
			TicketSecret: ticket.Ticket.Secret(),
		}

		if ticket.User != nil {
			ticketInfo.UserEmail = emailsByID[ticket.User.AuthID]
		}

		ticketInfos = append(ticketInfos, ticketInfo)
	}

	attendeeInfos := make([]*zenaov1.OrderAttendeeInfo, 0, len(attendees))
	for _, attendee := range attendees {
		if attendee == nil {
			continue
		}
		attendeeInfos = append(attendeeInfos, &zenaov1.OrderAttendeeInfo{
			UserEmail: emailsByID[authIDByUserID[attendee.UserID]],
			PriceId:   attendee.PriceID,
		})
	}

	return connect.NewResponse(&zenaov1.GetOrderDetailsResponse{
		Order: &zenaov1.OrderSummary{
			OrderId:      order.ID,
			EventId:      order.EventID,
			BuyerId:      order.BuyerID,
			AmountMinor:  order.AmountMinor,
			CurrencyCode: order.CurrencyCode,
			CreatedAt:    order.CreatedAt,
		},
		Tickets:   ticketInfos,
		Attendees: attendeeInfos,
	}), nil
}
