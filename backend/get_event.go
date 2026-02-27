package main

import (
	"context"
	"errors"
	"sort"

	"connectrpc.com/connect"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) GetEvent(ctx context.Context, req *connect.Request[zenaov1.GetEventRequest]) (*connect.Response[zenaov1.GetEventResponse], error) {
	if req.Msg.EventId == "" {
		return nil, errors.New("event ID is required")
	}

	var (
		evt          *zeni.Event
		organizers   []*zeni.User
		gatekeepers  []*zeni.User
		participants uint32
		checkedIn    uint32
		priceGroups  []*zeni.PriceGroup
	)

	if err := s.DB.TxWithSpan(ctx, "GetEvent", func(tx zeni.DB) error {
		var err error
		evt, err = tx.GetEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		organizers, err = tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, req.Msg.EventId, []string{zeni.RoleOrganizer})
		if err != nil {
			return err
		}
		gatekeepers, err = tx.GetOrgUsersWithRoles(zeni.EntityTypeEvent, req.Msg.EventId, []string{zeni.RoleGatekeeper})
		if err != nil {
			return err
		}
		participants, err = tx.CountEntities(zeni.EntityTypeEvent, req.Msg.EventId, zeni.EntityTypeUser, zeni.RoleParticipant)
		if err != nil {
			return err
		}
		checkedIn, err = tx.CountCheckedIn(req.Msg.EventId)
		if err != nil {
			return err
		}

		groups, err := tx.GetPriceGroupsByEvent(req.Msg.EventId)
		if err != nil {
			return err
		}
		priceGroups = groups

		return nil
	}); err != nil {
		return nil, err
	}

	orgIDs := mapsl.Map(organizers, func(u *zeni.User) string {
		return u.ID
	})

	gkpIDs := mapsl.Map(gatekeepers, func(u *zeni.User) string {
		return u.ID
	})

	privacy, err := zeni.EventPrivacyFromPasswordHash(evt.PasswordHash)
	if err != nil {
		return nil, err
	}

	info := zenaov1.EventInfo{
		Id:           evt.ID,
		Title:        evt.Title,
		Description:  evt.Description,
		ImageUri:     evt.ImageURI,
		Organizers:   orgIDs,
		Gatekeepers:  gkpIDs,
		StartDate:    evt.StartDate.Unix(),
		EndDate:      evt.EndDate.Unix(),
		Capacity:     evt.Capacity,
		Location:     evt.Location,
		Participants: participants,
		CheckedIn:    checkedIn,
		Discoverable: evt.Discoverable,
		Privacy:      privacy,
	}
	if len(priceGroups) > 0 {
		info.PricesGroups = make([]*zenaov1.EventPriceGroup, 0, len(priceGroups))
		for _, group := range priceGroups {
			groupPrices := group.Prices
			sort.Slice(groupPrices, func(i, j int) bool {
				if groupPrices[i].AmountMinor == groupPrices[j].AmountMinor {
					return groupPrices[i].CurrencyCode < groupPrices[j].CurrencyCode
				}
				return groupPrices[i].AmountMinor < groupPrices[j].AmountMinor
			})

			eventGroup := &zenaov1.EventPriceGroup{
				Id:   group.ID,
				Name: "",
			}
			if len(groupPrices) > 0 {
				eventGroup.Prices = make([]*zenaov1.EventPrice, 0, len(groupPrices))
				for _, price := range groupPrices {
					eventPrice := &zenaov1.EventPrice{
						AmountMinor:      price.AmountMinor,
						CurrencyCode:     price.CurrencyCode,
						PaymentAccountId: price.PaymentAccountID,
						Id:               price.ID,
					}
					if price.PaymentAccount != nil {
						eventPrice.PaymentAccountType = price.PaymentAccount.PlatformType
					}
					eventGroup.Prices = append(eventGroup.Prices, eventPrice)
				}
			}
			info.PricesGroups = append(info.PricesGroups, eventGroup)
		}
	}

	return connect.NewResponse(&zenaov1.GetEventResponse{Event: &info}), nil
}
