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
	// Resolve emails by internal user id: registered users get theirs from the
	// auth provider, guests carry it directly on the DB user.
	emailByUserID := map[string]string{}
	authIDToUserIDs := map[string][]string{}
	addUser := func(userID, authID, guestEmail string) {
		userID = strings.TrimSpace(userID)
		if userID == "" {
			return
		}
		if _, done := emailByUserID[userID]; done {
			return
		}
		if strings.TrimSpace(authID) == "" {
			emailByUserID[userID] = guestEmail
			return
		}
		authIDToUserIDs[authID] = append(authIDToUserIDs[authID], userID)
	}
	for _, user := range attendeeUsers {
		if user != nil {
			addUser(user.ID, user.AuthID, user.Email)
		}
	}
	for _, ticket := range tickets {
		if ticket != nil && ticket.User != nil {
			addUser(ticket.User.ID, ticket.User.AuthID, ticket.User.Email)
		}
	}

	authIDs := make([]string, 0, len(authIDToUserIDs))
	for authID := range authIDToUserIDs {
		authIDs = append(authIDs, authID)
	}
	authUsers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
	if err != nil {
		return nil, err
	}
	for _, user := range authUsers {
		if user == nil {
			continue
		}
		for _, userID := range authIDToUserIDs[user.ID] {
			emailByUserID[userID] = user.Email
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
			ticketInfo.UserEmail = emailByUserID[ticket.User.ID]
		}

		ticketInfos = append(ticketInfos, ticketInfo)
	}

	attendeeInfos := make([]*zenaov1.OrderAttendeeInfo, 0, len(attendees))
	for _, attendee := range attendees {
		if attendee == nil {
			continue
		}
		attendeeInfos = append(attendeeInfos, &zenaov1.OrderAttendeeInfo{
			UserEmail: emailByUserID[attendee.UserID],
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
