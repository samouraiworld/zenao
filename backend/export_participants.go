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

	roles, err := s.Chain.WithContext(ctx).EntityRoles(zUser.ID, zeni.EntityTypeEvent, req.Msg.EventId)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(roles, zeni.RoleOrganizer) {
		return nil, errors.New("user is not organizer of the event")
	}

	// participants, err := s.Chain.WithContext(ctx).GetEventUsersByRole(req.Msg.EventId, zeni.RoleParticipant)
	// if err != nil {
	// 	return nil, err
	// }

	// idsList := mapsl.Map(participants, func(u *zeni.User) string { return u.AuthID })
	// TODO: fix it
	authParticipants, err := s.Auth.GetUsersFromIDs(ctx, []string{})
	if err != nil {
		return nil, err
	}

	mailMap := make(map[string]string)
	for _, p := range authParticipants {
		mailMap[p.ID] = p.Email
	}

	type participantData struct {
		email       string
		displayName string
		createdAt   time.Time
	}

	var participantDataList []participantData
	// for _, p := range participants {
	// 	email := mailMap[p.AuthID]
	// 	if email == "" {
	// 		s.Logger.Warn("export-participants-fail-to-retrieve-auth-user",
	// 			zap.String("event-id", req.Msg.EventId),
	// 			zap.String("user-id", p.ID),
	// 			zap.String("auth-user-id", p.AuthID))
	// 		continue
	// 	}

	// 	displayName := p.DisplayName
	// 	if displayName == "" {
	// 		displayName = fmt.Sprintf("Zenao User #%s", p.ID)
	// 	}

	// 	participantDataList = append(participantDataList, participantData{
	// 		email:       email,
	// 		displayName: displayName,
	// 		createdAt:   p.CreatedAt,
	// 	})
	// }

	slices.SortFunc(participantDataList, func(a, b participantData) int {
		return strings.Compare(a.email, b.email)
	})

	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{"Email", "Name", "Ticket CreatedAt"}); err != nil {
		return nil, err
	}
	for _, data := range participantDataList {
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
