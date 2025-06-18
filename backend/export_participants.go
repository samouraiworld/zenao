package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"slices"
	"time"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) ExportParticipants(ctx context.Context, req *connect.Request[zenaov1.ExportParticipantsRequest]) (*connect.Response[zenaov1.ExportParticipantsResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("export-participants", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID))

	var tickets []*zeni.SoldTicket
	if err := s.DB.Tx(func(db zeni.DB) error {
		roles, err := db.UserRoles(zUser.ID, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, "organizer") && !slices.Contains(roles, "gatekeeper") {
			return errors.New("user is not organizer or gatekeeper of the event")
		}
		tickets, err = db.GetEventTickets(req.Msg.EventId)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	idsList := mapsl.Map(tickets, func(t *zeni.SoldTicket) string { return t.User.AuthID })
	authParticipants, err := s.Auth.GetUsersFromIDs(ctx, idsList)
	if err != nil {
		return nil, err
	}
	mailMap := make(map[string]string)
	for _, p := range authParticipants {
		mailMap[p.ID] = p.Email
	}

	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{"Email", "Name", "Ticket CreatedAt"}); err != nil {
		return nil, err
	}
	for _, t := range tickets {
		email := mailMap[t.User.AuthID]
		if email == "" {
			s.Logger.Warn("export-participants-fail-to-retrieve-auth-user", zap.String("event-id", req.Msg.EventId), zap.String("user-id", zUser.ID), zap.String("auth-user-id", t.User.AuthID))
			continue
		}
		createdAt := t.CreatedAt.Format(time.RFC3339)
		if t.User.DisplayName == "" {
			t.User.DisplayName = fmt.Sprintf("Zenao User #%s", t.User.ID)
		}
		if err := writer.Write([]string{email, t.User.DisplayName, createdAt}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	filename := fmt.Sprintf("participants-%s.csv", req.Msg.EventId)

	return connect.NewResponse(&zenaov1.ExportParticipantsResponse{
		Content:  buffer.String(),
		Filename: filename,
		MimeType: "text/csv",
	}), nil
}
