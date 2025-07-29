package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"slices"
	"strings"
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
		roles, err := db.EntityRoles(zeni.EntityTypeUser, zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("user is not organizer of the event")
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

	type ticketData struct {
		email       string
		displayName string
		createdAt   time.Time
	}

	var ticketDataList []ticketData
	for _, t := range tickets {
		email := mailMap[t.User.AuthID]
		if email == "" {
			s.Logger.Warn("export-participants-fail-to-retrieve-auth-user",
				zap.String("event-id", req.Msg.EventId),
				zap.String("user-id", zUser.ID),
				zap.String("auth-user-id", t.User.AuthID))
			continue
		}

		displayName := t.User.DisplayName
		if displayName == "" {
			displayName = fmt.Sprintf("Zenao User #%s", t.User.ID)
		}

		ticketDataList = append(ticketDataList, ticketData{
			email:       email,
			displayName: displayName,
			createdAt:   t.CreatedAt,
		})
	}

	slices.SortFunc(ticketDataList, func(a, b ticketData) int {
		return strings.Compare(a.email, b.email)
	})

	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{"Email", "Name", "Ticket CreatedAt"}); err != nil {
		return nil, err
	}
	for _, data := range ticketDataList {
		if err := writer.Write([]string{
			data.email,
			data.displayName,
			data.createdAt.Format(time.RFC3339),
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	filename := fmt.Sprintf("participants-event-%s.csv", req.Msg.EventId)

	return connect.NewResponse(&zenaov1.ExportParticipantsResponse{
		Content:  buffer.String(),
		Filename: filename,
		MimeType: "text/csv",
	}), nil
}
