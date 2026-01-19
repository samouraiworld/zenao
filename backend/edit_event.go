package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/resend/resend-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) EditEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.EditEventRequest],
) (*connect.Response[zenaov1.EditEventResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("edit-event", zap.String("event-id", req.Msg.EventId), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	authOrgas, err := s.Auth.EnsureUsersExists(ctx, req.Msg.Organizers)
	if err != nil {
		return nil, err
	}

	//XXX: refactor the logic to avoid duplicate w/ gkps ?
	var organizersIDs []string
	organizersIDs = append(organizersIDs, actor.ID())
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

	if err := validateEvent(req.Msg.StartDate, req.Msg.EndDate, req.Msg.Title, req.Msg.Description, req.Msg.Location, req.Msg.ImageUri, req.Msg.Capacity, req.Msg.TicketPrice, req.Msg.Password); err != nil {
		return nil, fmt.Errorf("invalid input: %w", err)
	}
	if err := validatePriceGroups(req.Msg.PricesGroups); err != nil {
		return nil, fmt.Errorf("invalid price groups: %w", err)
	}
	if hasPaidPrices(req.Msg.PricesGroups) && req.Msg.CommunityId == "" {
		return nil, errors.New("community is required for paid events")
	}

	var (
		targets      []*zeni.User
		participants []*zeni.User
		targetIDs    = make(map[string]bool)
		cmt          *zeni.Community
		newCmt       *zeni.Community
		evt          *zeni.Event
	)
	if err := s.DB.TxWithSpan(ctx, "db.EditEvent", func(db zeni.DB) error {
		roles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeEvent, req.Msg.EventId)
		if err != nil {
			return err
		}
		if !slices.Contains(roles, zeni.RoleOrganizer) {
			return errors.New("user is not organizer of the event")
		}

		if cmt, err = db.GetEventCommunity(req.Msg.EventId); err != nil {
			return err
		}

		if cmt != nil && cmt.ID != req.Msg.CommunityId {
			if err = db.RemoveEventFromCommunity(req.Msg.EventId, cmt.ID); err != nil {
				return err
			}
		}

		if req.Msg.CommunityId != "" && (cmt == nil || req.Msg.CommunityId != cmt.ID) {
			newCmt, err = db.GetCommunity(req.Msg.CommunityId)
			if err != nil {
				return err
			}
			entityRoles, err := db.EntityRoles(zeni.EntityTypeUser, actor.ID(), zeni.EntityTypeCommunity, req.Msg.CommunityId)
			if err != nil {
				return err
			}
			if !slices.Contains(entityRoles, zeni.RoleAdministrator) {
				return errors.New("user is not administrator of the community")
			}
			if err = db.AddEventToCommunity(req.Msg.EventId, req.Msg.CommunityId); err != nil {
				return err
			}
			targets, err = db.GetOrgUsersWithRoles(zeni.EntityTypeCommunity, req.Msg.CommunityId, []string{zeni.RoleMember})
			if err != nil {
				return err
			}
			participants, err = db.GetOrgUsersWithRoles(zeni.EntityTypeEvent, req.Msg.EventId, []string{zeni.RoleParticipant})
			if err != nil {
				return err
			}

			for _, target := range targets {
				targetIDs[target.ID] = true
			}

			for _, participant := range participants {
				if !targetIDs[participant.ID] {
					if err := db.AddMemberToCommunity(req.Msg.CommunityId, participant.ID); err != nil {
						return err
					}
				}
			}
		}

		if evt, err = db.EditEvent(req.Msg.EventId, organizersIDs, gatekeepersIDs, req.Msg); err != nil {
			return err
		}

		priceGroups, err := db.GetPriceGroupsByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}

		priceGroupsByID := make(map[string]*zeni.PriceGroup, len(priceGroups))
		for _, group := range priceGroups {
			priceGroupsByID[group.ID] = group
		}

		for _, group := range priceGroups {
			// FIXME: capacity should not be tied to the event capacity
			if err := db.UpdatePriceGroupCapacity(group.ID, req.Msg.Capacity); err != nil {
				return err
			}
		}

		if len(req.Msg.PricesGroups) > 0 {
			var (
				paymentAccount   *zeni.PaymentAccount
				paymentAccountID string
			)

			if hasPaidPrices(req.Msg.PricesGroups) {
				paymentAccount, err = db.GetPaymentAccountByCommunityPlatform(req.Msg.CommunityId, zeni.PaymentPlatformStripeConnect)
				if err != nil {
					return errors.New("payment account is required for paid events")
				}
				paymentAccountID = paymentAccount.ID
			}

			for idx, group := range req.Msg.PricesGroups {
				var targetGroup *zeni.PriceGroup
				groupID := strings.TrimSpace(group.Id)
				if groupID != "" {
					var ok bool
					targetGroup, ok = priceGroupsByID[groupID]
					if !ok {
						return errors.New("price group not found")
					}
				} else if idx < len(priceGroups) {
					targetGroup = priceGroups[idx]
				} else {
					targetGroup, err = db.CreatePriceGroup(req.Msg.EventId, req.Msg.Capacity)
					if err != nil {
						return err
					}
					priceGroups = append(priceGroups, targetGroup)
					priceGroupsByID[targetGroup.ID] = targetGroup
				}

				if len(group.Prices) == 0 {
					continue
				}

				existingPrices := targetGroup.Prices
				existingPricesByID := make(map[string]*zeni.Price, len(existingPrices))
				for _, existingPrice := range existingPrices {
					existingPricesByID[existingPrice.ID] = existingPrice
				}
				for priceIdx, price := range group.Prices {
					amountMinor := price.AmountMinor
					currency := strings.ToUpper(strings.TrimSpace(price.CurrencyCode))
					if amountMinor == 0 {
						currency = ""
					}

					var (
						pricePaymentAccount *zeni.PaymentAccount
						priceAccountID      string
					)
					if amountMinor > 0 {
						priceAccountID = paymentAccountID
						pricePaymentAccount = paymentAccount
					}

					priceID := strings.TrimSpace(price.Id)
					if priceID != "" {
						existingPrice, ok := existingPricesByID[priceID]
						if !ok {
							return errors.New("price not found")
						}
						if err := db.UpdatePrice(pricePaymentAccount, &zeni.Price{
							ID:               existingPrice.ID,
							PriceGroupID:     targetGroup.ID,
							AmountMinor:      amountMinor,
							CurrencyCode:     currency,
							PaymentAccountID: priceAccountID,
						}); err != nil {
							return err
						}
					} else if priceIdx < len(existingPrices) {
						if err := db.UpdatePrice(pricePaymentAccount, &zeni.Price{
							ID:               existingPrices[priceIdx].ID,
							PriceGroupID:     targetGroup.ID,
							AmountMinor:      amountMinor,
							CurrencyCode:     currency,
							PaymentAccountID: priceAccountID,
						}); err != nil {
							return err
						}
					} else {
						if _, err := db.CreatePrice(pricePaymentAccount, &zeni.Price{
							PriceGroupID:     targetGroup.ID,
							AmountMinor:      amountMinor,
							CurrencyCode:     currency,
							PaymentAccountID: priceAccountID,
						}); err != nil {
							return err
						}
					}

					// TODO: delete unused prices
				}
				// TODO: delete unused price groups
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if newCmt != nil && time.Now().Add(24*time.Hour).Before(evt.StartDate) && req.Msg.CommunityEmail && s.MailClient != nil {
		participantsIDS := make(map[string]bool)
		for _, participant := range participants {
			participantsIDS[participant.ID] = true
		}

		var authIDs []string
		for _, target := range targets {
			// Skip teams which don't have AuthID
			if target.AuthID == "" {
				continue
			}
			if !participantsIDS[target.ID] {
				authIDs = append(authIDs, target.AuthID)
			}
		}
		if len(authIDs) == 0 {
			return connect.NewResponse(&zenaov1.EditEventResponse{
				Id: req.Msg.EventId,
			}), nil
		}
		authTargets, err := s.Auth.GetUsersFromIDs(ctx, authIDs)
		if err != nil {
			return nil, err
		}

		htmlStr, text, err := communityNewEventMailContent(evt, newCmt)
		if err != nil {
			return nil, err
		}

		var requests []*resend.SendEmailRequest
		for _, authTarget := range authTargets {
			if authTarget.Email == "" {
				s.Logger.Error("edit-event", zap.String("target-id", authTarget.ID), zap.String("target-email", authTarget.Email), zap.Error(errors.New("target has no email")))
				continue
			}
			requests = append(requests, &resend.SendEmailRequest{
				From:    fmt.Sprintf("Zenao <%s>", s.MailSender),
				To:      []string{authTarget.Email},
				Subject: "New event by " + newCmt.DisplayName + "!",
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

	return connect.NewResponse(&zenaov1.EditEventResponse{
		Id: req.Msg.EventId,
	}), nil
}
