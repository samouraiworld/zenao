package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"
	_ "time/tzdata"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/mapsl"
	"github.com/samouraiworld/zenao/backend/webhook"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateEventRequest],
) (*connect.Response[zenaov1.CreateEventResponse], error) {
	user := s.Auth.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	// retrieve auto-incremented user ID from database, do not use auth provider's user ID directly for realms
	zUser, err := s.EnsureUserExists(ctx, user)
	if err != nil {
		return nil, err
	}

	s.Logger.Info("create-event", zap.String("title", req.Msg.Title), zap.String("user-id", zUser.ID), zap.Bool("user-banned", user.Banned))

	if user.Banned {
		return nil, errors.New("user is banned")
	}

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice, req.Msg.Password); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}

	//XXX: refactor the logic to avoid duplicate w/ gkps ?
	authOrgas, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Organizers)
	if err != nil {
		return nil, err
	}

	var organizersIDs []string
	organizersIDs = append(organizersIDs, zUser.ID)
	for _, authOrg := range authOrgas {
		if authOrg.Banned {
			return nil, fmt.Errorf("user %s is banned", authOrg.Email)
		}
		zOrg, err := s.EnsureUserExists(ctx, authOrg)
		if err != nil {
			return nil, err
		}
		if slices.Contains(organizersIDs, zOrg.ID) {
			return nil, fmt.Errorf("duplicate organizer: %s", authOrg.Email)
		}
		organizersIDs = append(organizersIDs, zOrg.ID)
	}

	authGkps, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Gatekeepers)
	if err != nil {
		return nil, err
	}

	var gatekeepersIDs []string
	for _, authGkp := range authGkps {
		if authGkp.Banned {
			return nil, fmt.Errorf("user %s is banned", authGkp.Email)
		}
		zGkp, err := s.EnsureUserExists(ctx, authGkp)
		if err != nil {
			return nil, err
		}
		if slices.Contains(gatekeepersIDs, zGkp.ID) {
			return nil, fmt.Errorf("duplicate gatekeeper: %s", authGkp.Email)
		}
		gatekeepersIDs = append(gatekeepersIDs, zGkp.ID)
	}

	// TODO: find a way to have better ids ?
	uuid := uuid.New().String()
	evtID := strings.ReplaceAll(uuid, "-", "_")
	evtRealmID := s.Chain.EventRealmID(evtID)
	userRealmID := s.Chain.UserRealmID(zUser.ID)

	passwordHash, err := zeni.NewPasswordHash(req.Msg.Password)
	if err != nil {
		return nil, err
	}
	privacy, err := zeni.EventPrivacyFromPasswordHash(passwordHash)
	if err != nil {
		return nil, err
	}

	// TODO: should we do it in one tx on-chain ?
	if err := s.Chain.WithContext(ctx).CreateEvent(evtRealmID, mapsl.Map(organizersIDs, s.Chain.UserRealmID), mapsl.Map(gatekeepersIDs, s.Chain.UserRealmID), req.Msg, privacy); err != nil {
		return nil, err
	}

	evt, err := s.Chain.WithContext(ctx).GetEvent(evtRealmID)
	if err != nil {
		return nil, err
	}

	if req.Msg.CommunityId != "" {
		if err := s.Chain.WithContext(ctx).AddEventToCommunity(userRealmID, s.Chain.CommunityRealmID(req.Msg.CommunityId), evtRealmID); err != nil {
			return nil, err
		}
	}

	var cmt *zenaov1.CommunityInfo
	var members []*zeni.User

	// TODO: test event with community creation
	if req.Msg.CommunityId != "" {
		cmt, err = s.Chain.WithContext(ctx).GetCommunity(s.Chain.CommunityRealmID(req.Msg.CommunityId))
		if err != nil {
			return nil, err
		}
		membersRealmIDs, err := s.Chain.WithContext(ctx).GetCommunityUsersByRole(s.Chain.CommunityRealmID(req.Msg.CommunityId), zeni.RoleMember)
		if err != nil {
			return nil, err
		}
		var memberIDs []string
		for _, memberRealmID := range membersRealmIDs {
			id, err := s.Chain.FromRealmIDToID(memberRealmID, "u")
			if err != nil {
				// TODO: skip non user members for now
				continue
			}
			memberIDs = append(memberIDs, id)
		}
		members, err = s.DB.GetUsersByIDs(memberIDs)
		if err != nil {
			return nil, err
		}
	}

	webhook.TrySendDiscordMessage(s.Logger, s.DiscordToken, evtID, evt)

	if s.MailClient != nil {
		htmlStr, text, err := ticketsConfirmationMailContent(evtID, evt, "Event created!")
		if err != nil {
			s.Logger.Error("generate-event-email-content", zap.Error(err), zap.String("event-id", evtID))
		} else {
			// XXX: Replace sender name with organizer name
			if _, err := s.MailClient.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{user.Email},
				Subject: fmt.Sprintf("%s - Creation confirmed", evt.Title),
				Html:    htmlStr,
				Text:    text,
			}); err != nil {
				s.Logger.Error("send-event-confirmation-email", zap.Error(err), zap.String("event-id", evtID))
			}
		}
	}

	if cmt != nil && len(members) > 0 && req.Msg.CommunityEmail && s.MailClient != nil {
		var authIDs []string
		for _, member := range members {
			authIDs = append(authIDs, member.AuthID)
		}
		authMembers, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
		if err != nil {
			return nil, err
		}

		htmlStr, text, err := communityNewEventMailContent(evtID, evt, req.Msg.CommunityId, cmt)
		if err != nil {
			return nil, err
		}

		var requests []*resend.SendEmailRequest
		for _, authMember := range authMembers {
			if authMember.Email == "" {
				s.Logger.Error("create-event", zap.String("target-id", authMember.ID), zap.String("target-email", authMember.Email), zap.Error(errors.New("target has no email")))
				continue
			}
			requests = append(requests, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{authMember.Email},
				Subject: "New event by " + cmt.DisplayName + "!",
				Html:    htmlStr,
				Text:    text,
			})
		}
		count := 0
		s.Logger.Info("send-community-new-event-emails", zap.Int("count", len(requests)))
		for i := 0; i < len(requests); i += 100 {
			batch := requests[i:min(i+100, len(requests))]
			if _, err := s.MailClient.Batch.SendWithContext(context.Background(), batch); err != nil {
				s.Logger.Error("send-community-new-event-emails", zap.Error(err), zap.Int("batch-size", len(batch)))
				continue
			}
			count += len(batch)
			s.Logger.Info("send-community-new-event-emails", zap.Int("already-sent-count", count), zap.Int("total", len(requests)))
		}
	}

	return connect.NewResponse(&zenaov1.CreateEventResponse{
		Id: evtID,
	}), nil
}

func validateEvent(startDate, endDate uint64, title, description string, location *zenaov1.EventLocation, imageURI string, capacity uint32, ticketPrice float64, password string) error {
	if startDate >= endDate {
		return errors.New("end date must be after start date")
	}
	if len(title) < 2 || len(title) > 140 {
		return errors.New("title must be of length 2 to 140")
	}
	if len(description) < 10 || len(description) > 10000 {
		return errors.New("event description must be of length 10 to 10000")
	}
	if len(imageURI) == 0 || len(imageURI) > 400 {
		return errors.New("image uri must be of length 1 to 400")
	}
	// NOTE: url package supports uri parsing
	if _, err := url.Parse(imageURI); err != nil {
		return fmt.Errorf("invalid image uri: %w", err)
	}
	if capacity <= 0 {
		return errors.New("capacity must be greater than 0")
	}
	if ticketPrice != 0 {
		return errors.New("event with price is not supported")
	}

	// NOTE: location venue name can be empty

	instructions := location.GetInstructions()
	if len(instructions) > 10000 {
		return errors.New("location instructions over 10000 characters")
	}

	switch val := location.GetAddress().(type) {
	case *zenaov1.EventLocation_Custom:
		addr := val.Custom.GetAddress()
		if len(addr) == 0 || len(addr) > 400 {
			return errors.New("loc address must be of length 1 to 400")
		}

		tz := val.Custom.GetTimezone()
		if tz == "" {
			return errors.New("loc timezone empty")
		}
		_, err := time.LoadLocation(tz)
		if err != nil {
			return fmt.Errorf("loc timezone: %w", err)
		}
		if tz == "Local" {
			return errors.New("loc timezone can't be Local")
		}

	case *zenaov1.EventLocation_Geo:
		addr := val.Geo.GetAddress()
		if len(addr) == 0 || len(addr) > 400 {
			return errors.New("loc address must be of length 1 to 400")
		}

		lng := val.Geo.Lng
		if lng < -180 || lng > 180 {
			return errors.New("loc longitude must be in the range [-180,180]")
		}
		lat := val.Geo.Lat
		if lat < -90 || lat > 90 {
			return errors.New("loc latitude must be in the range [-90,90]")
		}

	case *zenaov1.EventLocation_Virtual:
		uri := val.Virtual.GetUri()
		if len(uri) == 0 || len(uri) > 400 {
			return errors.New("loc uri must be of length 1 to 400")
		}
		// NOTE: url package supports uri parsing
		if _, err := url.Parse(uri); err != nil {
			return fmt.Errorf("loc uri: %w", err)
		}

	default:
		return errors.New("unknown location kind")
	}

	// allowing any password length is a DoS vector
	if len(password) > zeni.MaxPasswordLen {
		return errors.New("password too long")
	}

	return nil
}
