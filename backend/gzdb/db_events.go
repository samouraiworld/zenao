package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

// CreateEvent implements zeni.DB.
func (g *gormZenaoDB) CreateEvent(creatorID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.CreateEventRequest) (*zeni.Event, error) {
	g, span := g.trace("gzdb.CreateEvent")
	defer span.End()

	// NOTE: request should be validated by caller

	creatorIDInt, err := strconv.ParseUint(creatorID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse creator id: %w", err)
	}

	passwordHash, err := newPasswordHash(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	evt := &Event{
		Title:        req.Title,
		Description:  req.Description,
		ImageURI:     req.ImageUri,
		StartDate:    time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:      time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		CreatorID:    uint(creatorIDInt),
		TicketPrice:  req.TicketPrice,
		Capacity:     req.Capacity,
		Discoverable: req.Discoverable,
		PasswordHash: passwordHash,
	}
	if err := evt.SetLocation(req.Location); err != nil {
		return nil, fmt.Errorf("convert location: %w", err)
	}

	if err := g.db.Create(evt).Error; err != nil {
		return nil, fmt.Errorf("create event in db: %w", err)
	}

	for _, organizerID := range organizersIDs {
		organizerIDInt, err := strconv.ParseUint(organizerID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse organizer id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(organizerIDInt),
			OrgType:    zeni.EntityTypeEvent,
			OrgID:      evt.ID,
			Role:       zeni.RoleOrganizer,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create organizer role assignment in db: %w", err)
		}
	}

	for _, gatekeeperID := range gatekeepersIDs {
		gatekeeperIDInt, err := strconv.ParseUint(gatekeeperID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse gatekeeper id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(gatekeeperIDInt),
			OrgType:    zeni.EntityTypeEvent,
			OrgID:      evt.ID,
			Role:       zeni.RoleGatekeeper,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create gatekeeper role assignment in db: %w", err)
		}
	}

	zevt, err := dbEventToZeniEvent(evt)
	if err != nil {
		return nil, fmt.Errorf("convert db event to zeni event: %w", err)
	}

	return zevt, nil
}

// CancelEvent implements zeni.DB.
func (g *gormZenaoDB) CancelEvent(eventID string) error {
	g, span := g.trace("gzdb.CancelEvent")
	defer span.End()

	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return err
	}

	priceGroups, err := g.getPriceGroupsByEvent(evtIDInt)
	if err != nil {
		return err
	}

	if len(priceGroups) > 0 {
		priceGroupsIDs := make([]uint, len(priceGroups))
		for i, priceGroup := range priceGroups {
			priceGroupsIDs[i] = priceGroup.ID
		}

		err = g.db.Delete(&Price{}, "price_group_id IN ?", priceGroupsIDs).Error
		if err != nil {
			return err
		}

		err = g.db.Delete(&PriceGroup{}, "event_id = ?", evtIDInt).Error
		if err != nil {
			return err
		}
	}

	err = g.db.Delete(&Event{}, evtIDInt).Error
	if err != nil {
		return err
	}

	return g.db.Where("entity_type = ? AND entity_id = ? AND org_type = ?", zeni.EntityTypeEvent, evtIDInt, zeni.EntityTypeCommunity).Delete(&EntityRole{}).Error
}

// EditEvent implements zeni.DB.
func (g *gormZenaoDB) EditEvent(eventID string, organizersIDs []string, gatekeepersIDs []string, req *zenaov1.EditEventRequest) (*zeni.Event, error) {
	g, span := g.trace("gzdb.EditEvent")
	defer span.End()

	// XXX: validate?
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, err
	}

	passwordHash := ""
	if req.UpdatePassword {
		passwordHash, err = newPasswordHash(req.Password)
		if err != nil {
			return nil, errors.New("failed to hash password")
		}
	}

	evt := Event{
		Title:        req.Title,
		Description:  req.Description,
		ImageURI:     req.ImageUri,
		StartDate:    time.Unix(int64(req.StartDate), 0), // XXX: overflow?
		EndDate:      time.Unix(int64(req.EndDate), 0),   // XXX: overflow?
		TicketPrice:  req.TicketPrice,
		Capacity:     req.Capacity,
		Discoverable: req.Discoverable,
		PasswordHash: passwordHash,
	}
	if err := evt.SetLocation(req.Location); err != nil {
		return nil, err
	}

	if err := g.updateUserRoles(zeni.RoleOrganizer, organizersIDs, eventID, zeni.EntityTypeEvent); err != nil {
		return nil, err
	}

	if err := g.updateUserRoles(zeni.RoleGatekeeper, gatekeepersIDs, eventID, zeni.EntityTypeEvent); err != nil {
		return nil, err
	}

	if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Updates(evt).Error; err != nil {
		return nil, err
	}

	if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Update("ics_sequence_number", gorm.Expr("ics_sequence_number + ?", 1)).Error; err != nil {
		return nil, err
	}

	// Update db with Discoverable value if changed to false
	if !req.Discoverable {
		if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Update("discoverable", false).Error; err != nil {
			return nil, err
		}
	}

	// XXX: this is a hack to allow to disable the guard, since empty values are ignored by db.Updates on structs
	// we should rewrite this if db become bottleneck
	if req.UpdatePassword && req.Password == "" {
		if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Update("password_hash", "").Error; err != nil {
			return nil, err
		}
	}

	dbevt, err := g.getDBEvent(eventID)
	if err != nil {
		return nil, err
	}

	return dbEventToZeniEvent(dbevt)
}

// GetEvent implements zeni.DB.
func (g *gormZenaoDB) GetEvent(id string) (*zeni.Event, error) {
	evt, err := g.getDBEvent(id)
	if err != nil {
		return nil, err
	}
	return dbEventToZeniEvent(evt)
}

// ListEvents implements zeni.DB.
func (g *gormZenaoDB) ListEvents(limit int, offset int, from int64, to int64, discoverable zenaov1.DiscoverableFilter, locationFilter *zeni.LocationFilter) ([]*zeni.Event, error) {
	g, span := g.trace("gzdb.ListEvents")
	defer span.End()

	var dbEvts []Event
	query := g.db.Model(&Event{})

	// XXX: if both value set we need to know if we want reverse or not (rep. of what we have in eventreg with Iterate/ReverseIterate)
	if from != 0 || to != 0 {
		fromTime := time.Unix(from, 0)
		toTime := time.Unix(to, 0)
		if from <= to {
			query = query.
				Where("end_date >= ? AND end_date <= ?", fromTime, toTime).
				Order("end_date ASC, id ASC")
		} else {
			query = query.
				Where("end_date >= ? AND end_date <= ?", toTime, fromTime).
				Order("end_date DESC, id DESC")
		}
	} else {
		query = query.Order("end_date DESC, id DESC")
	}

	if discoverable != zenaov1.DiscoverableFilter_DISCOVERABLE_FILTER_UNSPECIFIED {
		d := discoverable == zenaov1.DiscoverableFilter_DISCOVERABLE_FILTER_DISCOVERABLE
		query = query.Where("discoverable = ?", d)
	}

	// Filter by location if provided.
	// Uses Haversine formula to calculate distance between two points on Earth.
	// Only applies to events with geo location (loc_kind = 'geo').
	if locationFilter != nil && locationFilter.RadiusKm > 0 {
		// Earth's radius in kilometers
		const earthRadiusKm = 6371.0
		query = query.Where(`loc_kind = 'geo' AND (
			? * 2 * ASIN(SQRT(
				POWER(SIN((RADIANS(loc_lat) - RADIANS(?)) / 2), 2) +
				COS(RADIANS(?)) * COS(RADIANS(loc_lat)) *
				POWER(SIN((RADIANS(loc_lng) - RADIANS(?)) / 2), 2)
			))
		) <= ?`, earthRadiusKm, locationFilter.Lat, locationFilter.Lat, locationFilter.Lng, locationFilter.RadiusKm)
	}

	if err := query.Limit(limit).Offset(offset).Find(&dbEvts).Error; err != nil {
		return nil, fmt.Errorf("query events: %w", err)
	}

	zenEvts := make([]*zeni.Event, 0, len(dbEvts))
	for _, dbEvt := range dbEvts {
		zenCmt, err := dbEventToZeniEvent(&dbEvt)
		if err != nil {
			return nil, fmt.Errorf("convert db event to zeni event: %w", err)
		}
		zenEvts = append(zenEvts, zenCmt)
	}

	return zenEvts, nil
}

// ListEventsByUserRoles implements zeni.DB.
func (g *gormZenaoDB) ListEventsByUserRoles(userID string, roles []string, limit int, offset int, from int64, to int64, discoverable zenaov1.DiscoverableFilter) ([]*zeni.EventWithRoles, error) {
	g, span := g.trace("gzdb.ListEventsByUserRoles")
	defer span.End()

	if len(roles) == 0 {
		return []*zeni.EventWithRoles{}, nil
	}

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	query := g.db.Model(&Event{}).
		Distinct().
		Joins("INNER JOIN entity_roles ON entity_roles.org_id = events.id").
		Where("entity_roles.entity_type = ? AND entity_roles.entity_id = ? AND entity_roles.org_type = ? AND entity_roles.role IN ?",
			zeni.EntityTypeUser, userIDInt, zeni.EntityTypeEvent, roles)

	if from != 0 || to != 0 {
		fromTime := time.Unix(from, 0)
		toTime := time.Unix(to, 0)
		if from <= to {
			query = query.
				Where("events.end_date >= ? AND events.end_date <= ?", fromTime, toTime).
				Order("events.end_date ASC, events.id ASC")
		} else {
			query = query.
				Where("events.end_date >= ? AND events.end_date <= ?", toTime, fromTime).
				Order("events.end_date DESC, events.id DESC")
		}
	} else {
		query = query.Order("events.end_date DESC, events.id DESC")
	}

	if discoverable != zenaov1.DiscoverableFilter_DISCOVERABLE_FILTER_UNSPECIFIED {
		d := discoverable == zenaov1.DiscoverableFilter_DISCOVERABLE_FILTER_DISCOVERABLE
		query = query.Where("events.discoverable = ?", d)
	}

	var dbEvts []Event
	if err := query.Limit(limit).Offset(offset).Find(&dbEvts).Error; err != nil {
		return nil, fmt.Errorf("query events: %w", err)
	}

	if len(dbEvts) == 0 {
		return []*zeni.EventWithRoles{}, nil
	}

	eventIDs := make([]uint, len(dbEvts))
	for i, evt := range dbEvts {
		eventIDs[i] = evt.ID
	}

	var entityRoles []EntityRole
	if err := g.db.Model(&EntityRole{}).
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id IN ? AND role IN ?",
			zeni.EntityTypeUser, userIDInt, zeni.EntityTypeEvent, eventIDs, roles).
		Find(&entityRoles).Error; err != nil {
		return nil, fmt.Errorf("query entity roles: %w", err)
	}

	roleMap := make(map[uint][]string)
	for _, er := range entityRoles {
		roleMap[er.OrgID] = append(roleMap[er.OrgID], er.Role)
	}

	result := make([]*zeni.EventWithRoles, 0, len(dbEvts))
	for _, dbEvt := range dbEvts {
		zenEvt, err := dbEventToZeniEvent(&dbEvt)
		if err != nil {
			return nil, fmt.Errorf("convert event: %w", err)
		}

		result = append(result, &zeni.EventWithRoles{
			Event: zenEvt,
			Roles: roleMap[dbEvt.ID],
		})
	}

	return result, nil
}

// CountCheckedIn implements zeni.DB.
func (g *gormZenaoDB) CountCheckedIn(eventID string) (uint32, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse event id: %w", err)
	}

	var count int64
	if err := g.db.Model(&Checkin{}).
		Joins("JOIN sold_tickets ON sold_tickets.id = checkins.sold_ticket_id").
		Where("sold_tickets.event_id = ?", evtIDInt).
		Count(&count).Error; err != nil {
		return 0, err
	}

	return uint32(count), nil
}

// GetEvent implements zeni.DB.
func (g *gormZenaoDB) getDBEvent(id string) (*Event, error) {
	evtIDInt, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	var evt Event
	evt.ID = uint(evtIDInt)
	if err := g.db.First(&evt).Error; err != nil {
		return nil, err
	}
	return &evt, nil
}

// GetAllEvents implements zeni.DB.
func (g *gormZenaoDB) GetAllEvents() ([]*zeni.Event, error) {
	var events []*Event
	if err := g.db.Find(&events).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Event, 0, len(events))
	for _, e := range events {
		zevt, err := dbEventToZeniEvent(e)
		if err != nil {
			return nil, err
		}
		res = append(res, zevt)
	}
	return res, nil
}

// GetDeletedEvents implements zeni.DB.
func (g *gormZenaoDB) GetDeletedEvents() ([]*zeni.Event, error) {
	var events []Event
	if err := g.db.Unscoped().Where("deleted_at IS NOT NULL").Find(&events).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Event, 0, len(events))
	for _, e := range events {
		zevt, err := dbEventToZeniEvent(&e)
		if err != nil {
			return nil, fmt.Errorf("convert db event to zeni event: %w", err)
		}
		res = append(res, zevt)
	}
	return res, nil
}

// GetEventTickets implements zeni.DB.
func (g *gormZenaoDB) GetEventTickets(eventID string) ([]*zeni.SoldTicket, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}

	tickets := []*SoldTicket{}
	if err := g.db.Preload("Checkin").Preload("User").Find(&tickets, "event_id = ?", evtIDInt).Error; err != nil {
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

// GetEventCommunity implements zeni.DB.
func (g *gormZenaoDB) GetEventCommunity(eventID string) (*zeni.Community, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}

	var roles []EntityRole
	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND role = ?",
			zeni.EntityTypeEvent, evtIDInt, zeni.EntityTypeCommunity, zeni.RoleEvent).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, nil
	}
	if len(roles) > 1 {
		return nil, fmt.Errorf("event %d has multiple communities: %d", evtIDInt, len(roles))
	}

	cmt, err := g.getDBCommunity(strconv.FormatUint(uint64(roles[0].OrgID), 10))
	if err != nil {
		return nil, fmt.Errorf("get community by id %d: %w", roles[0].OrgID, err)
	}

	return dbCommunityToZeniCommunity(cmt)
}
