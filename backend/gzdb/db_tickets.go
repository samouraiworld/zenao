package gzdb

import (
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Participate implements zeni.DB.
// Uses a GORM transaction to atomically check capacity, prevent duplicates,
// and insert the ticket + role. This prevents race conditions where concurrent
// requests could both pass the capacity check and cause overbooking.
func (g *gormZenaoDB) Participate(eventID string, buyerID string, userID string, ticketSecret string, password string, needPassword bool) error {
	return g.participate(eventID, buyerID, userID, ticketSecret, password, needPassword, nil, nil, nil, nil, "", nil)
}

func (g *gormZenaoDB) participate(
	eventID string,
	buyerID string,
	userID string,
	ticketSecret string,
	password string,
	needPassword bool,
	orderID *string,
	priceID *uint,
	priceGroupID *uint,
	orderAttendeeID *string,
	currencyCode string,
	amountMinor *int64,
) error {
	g, span := g.trace("gzdb.participate")
	defer span.End()

	buyerIDint, err := strconv.ParseUint(buyerID, 10, 32)
	if err != nil {
		return err
	}

	userIDint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return err
	}

	ticket, err := zeni.NewTicketFromSecret(ticketSecret)
	if err != nil {
		return err
	}

	evt, err := g.getDBEvent(eventID)
	if err != nil {
		return err
	}

	if needPassword {
		validPass, err := validatePassword(password, evt.PasswordHash)
		if err != nil {
			return err
		}
		if !validPass {
			return errors.New("invalid password")
		}
	}

	// Wrap capacity check + ticket insert + role assignment in a single
	// GORM transaction. SQLite acquires an EXCLUSIVE lock on the first write
	// within a transaction, which serializes concurrent Participate calls
	// and prevents the TOCTOU race on the capacity check.
	return g.db.Transaction(func(tx *gorm.DB) error {
		var participantsCount int64
		if err := tx.Model(&SoldTicket{}).Where("event_id = ?", evt.ID).Count(&participantsCount).Error; err != nil {
			return err
		}

		remaining := int64(evt.Capacity) - participantsCount
		if remaining <= 0 {
			return errors.New("sold out")
		}

		var count int64
		if err := tx.Model(&SoldTicket{}).Where("event_id = ? AND user_id = ?", evt.ID, userIDint).Count(&count).Error; err != nil {
			return err
		}
		if count != 0 {
			return errors.New("user is already participant for this event")
		}

		if strings.TrimSpace(currencyCode) != "" {
			currencyCode = strings.ToUpper(strings.TrimSpace(currencyCode))
		}

		var resolvedPriceGroupID *uint
		if priceGroupID != nil {
			resolvedPriceGroupID = priceGroupID
		} else {
			var group PriceGroup
			err := tx.
				Select("id").
				Where("event_id = ?", evt.ID).
				Order("id ASC").
				First(&group).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			if group.ID != 0 {
				resolvedPriceGroupID = &group.ID
			}
		}

		createDB := tx
		if orderAttendeeID != nil && strings.TrimSpace(*orderAttendeeID) != "" {
			createDB = createDB.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "order_attendee_id"}},
				DoNothing: true,
			})
		}

		if err := createDB.Create(&SoldTicket{
			EventID:         evt.ID,
			BuyerID:         uint(buyerIDint),
			UserID:          uint(userIDint),
			OrderID:         orderID,
			PriceID:         priceID,
			PriceGroupID:    resolvedPriceGroupID,
			OrderAttendeeID: orderAttendeeID,
			AmountMinor:     amountMinor,
			CurrencyCode:    currencyCode,
			Secret:          ticket.Secret(),
			Pubkey:          ticket.Pubkey(),
		}).Error; err != nil {
			return err
		}

		participant := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(userIDint),
			OrgType:    zeni.EntityTypeEvent,
			OrgID:      evt.ID,
			Role:       zeni.RoleParticipant,
		}

		if err := tx.Save(participant).Error; err != nil {
			return err
		}

		return nil
	})
}

// CancelParticipation implements zeni.DB.
func (g *gormZenaoDB) CancelParticipation(eventID string, userID string) error {
	g, span := g.trace("gzdb.CancelParticipation")
	defer span.End()

	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return err
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	if err := g.db.
		Model(&EntityRole{}).Where("org_type = ? AND org_id = ? AND entity_type = ? AND entity_id = ? AND role = ?",
		zeni.EntityTypeEvent, evtIDInt, zeni.EntityTypeUser, userIDInt, zeni.RoleParticipant).
		Delete(&EntityRole{}).Error; err != nil {
		return err
	}

	if err := g.db.Model(&SoldTicket{}).Where("event_id = ? AND user_id = ?", evtIDInt, userIDInt).Delete(&SoldTicket{}).Error; err != nil {
		return err
	}
	return nil
}

// GetDeletedTickets implements zeni.DB.
func (g *gormZenaoDB) GetDeletedTickets(eventID string) ([]*zeni.SoldTicket, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	var tickets []SoldTicket
	if err := g.db.Unscoped().Where("event_id = ? AND deleted_at IS NOT NULL", evtIDInt).Find(&tickets).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.SoldTicket, len(tickets))
	for i, ticket := range tickets {
		res[i], err = dbSoldTicketToZeniSoldTicket(&ticket)
		if err != nil {
			return nil, err
		}
	}
	return res, nil
}

// GetEventUserTicket implements zeni.DB.
func (g *gormZenaoDB) GetEventUserTicket(eventID string, userID string) (*zeni.SoldTicket, error) {
	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	var ticket *SoldTicket
	err = g.db.Model(&SoldTicket{}).Preload("Checkin").Preload("User").Where("event_id = ? AND user_id = ?", eventID, userIDint).First(&ticket).Error
	if err != nil {
		return nil, err
	}
	res, err := dbSoldTicketToZeniSoldTicket(ticket)
	if err != nil {
		return nil, err
	}
	return res, nil
}

// GetEventUserOrBuyerTickets implements zeni.DB.
func (g *gormZenaoDB) GetEventUserOrBuyerTickets(eventID string, userID string) ([]*zeni.SoldTicket, error) {
	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse buyer or user id: %w", err)
	}

	tickets := []*SoldTicket{}
	err = g.db.Model(&SoldTicket{}).Preload("Checkin").Preload("User").Find(&tickets, "event_id = ? AND (buyer_id = ? OR user_id = ?)", eventID, userIDint, userIDint).Error
	if err != nil {
		return nil, err
	}

	res := make([]*zeni.SoldTicket, len(tickets))
	for i, ticket := range tickets {
		res[i], err = dbSoldTicketToZeniSoldTicket(ticket)
		if err != nil {
			return nil, err
		}
	}

	return res, nil
}

// Checkin implements zeni.DB.
func (g *gormZenaoDB) Checkin(pubkey string, gatekeeperID string, signature string) (*zeni.Event, error) {
	g, span := g.trace("gzdb.Checkin")
	defer span.End()

	gatekeeperIDint, err := strconv.ParseUint(gatekeeperID, 10, 64)
	if err != nil {
		return nil, err
	}

	tickets := []*SoldTicket{}
	if err := g.db.Model(&SoldTicket{}).Preload("Checkin").Limit(1).Find(&tickets, "pubkey = ?", pubkey).Error; err != nil {
		return nil, err
	}
	if len(tickets) == 0 {
		return nil, errors.New("ticket pubkey not found")
	}
	dbTicket := tickets[0]

	if dbTicket.Checkin != nil {
		return nil, errors.New("ticket already checked-in")
	}

	roles, err := g.EntityRoles(zeni.EntityTypeUser, gatekeeperID, zeni.EntityTypeEvent, fmt.Sprint(dbTicket.EventID))
	if err != nil {
		return nil, err
	}
	if !slices.Contains(roles, zeni.RoleGatekeeper) && !slices.Contains(roles, zeni.RoleOrganizer) {
		return nil, errors.New("user is not gatekeeper or organizer for this event")
	}

	dbTicket.Checkin = &Checkin{
		GatekeeperID: uint(gatekeeperIDint),
		Signature:    signature,
	}

	if err := g.db.Save(dbTicket).Error; err != nil {
		return nil, err
	}

	return g.GetEvent(fmt.Sprint(dbTicket.EventID))
}
