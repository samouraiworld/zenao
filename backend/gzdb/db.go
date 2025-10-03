package gzdb

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/plugin/opentelemetry/tracing"
)

type User struct {
	gorm.Model         // this ID should be used for any database related logic (like querying)
	AuthID      string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation (auth provider id: clerk, auth0, etc)
	DisplayName string
	Bio         string
	AvatarURI   string
	Plan        string `gorm:"default:'free'"`
}

type EntityRole struct {
	CreatedAt time.Time `gorm:"<-:create"`
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	EntityType string `gorm:"primaryKey"` // e.g. "user", "event"
	EntityID   uint   `gorm:"primaryKey;autoIncrement:false"`

	OrgType string `gorm:"primaryKey"` // e.g. "event", "community"
	OrgID   uint   `gorm:"primaryKey;autoIncrement:false"`

	Role string `gorm:"primaryKey"`
}

type SoldTicket struct {
	gorm.Model
	EventID uint `gorm:"index"`
	BuyerID uint
	UserID  uint
	User    *User
	Price   float64
	Secret  string `gorm:"uniqueIndex;not null"`
	Pubkey  string `gorm:"uniqueIndex;not null"`
	Checkin *Checkin
}

type Checkin struct {
	// gorm.Model without ID
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	SoldTicketID uint `gorm:"primaryKey;not null"`
	GatekeeperID uint
	Signature    string
}

func SetupDB(dsn string) (zeni.DB, error) {
	var (
		db  *gorm.DB
		err error
	)

	if strings.HasPrefix(dsn, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        dsn,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	}
	if err != nil {
		return nil, err
	}

	if err := db.Use(tracing.NewPlugin()); err != nil {
		return nil, err
	}

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

// TxWithSpan implements zeni.DB.
func (g *gormZenaoDB) TxWithSpan(ctx context.Context, label string, cb func(db zeni.DB) error) error {
	spanCtx, span := otel.Tracer("gzdb").Start(
		ctx,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	defer span.End()
	return cb(g.withContext(spanCtx))
}

// WithContext implements zeni.DB.
func (g *gormZenaoDB) WithContext(ctx context.Context) zeni.DB {
	return g.withContext(ctx)
}

func (g *gormZenaoDB) withContext(ctx context.Context) *gormZenaoDB {
	return &gormZenaoDB{db: g.db.WithContext(ctx)}
}

func (g *gormZenaoDB) Tx(cb func(db zeni.DB) error) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return cb(&gormZenaoDB{db: tx})
	})
}

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

// ValidatePassword implements zeni.DB.
func (g *gormZenaoDB) ValidatePassword(req *zenaov1.ValidatePasswordRequest) (bool, error) {
	evt, err := g.getDBEvent(req.EventId)
	if err != nil {
		return false, err
	}

	return validatePassword(req.Password, evt.PasswordHash)
}

// GetEvent implements zeni.DB.
func (g *gormZenaoDB) GetEvent(id string) (*zeni.Event, error) {
	evt, err := g.getDBEvent(id)
	if err != nil {
		return nil, err
	}
	return dbEventToZeniEvent(evt)
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

// GetCommunity implements zeni.DB.
func (g *gormZenaoDB) getDBCommunity(id string) (*Community, error) {
	cmtIDInt, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	var cmt Community
	cmt.ID = uint(cmtIDInt)
	if err := g.db.First(&cmt).Error; err != nil {
		return nil, err
	}
	return &cmt, nil
}

// CreateUser implements zeni.DB.
func (g *gormZenaoDB) CreateUser(authID string) (*zeni.User, error) {
	user := &User{
		AuthID: authID,
	}
	if err := g.db.Create(user).Error; err != nil {
		return nil, err
	}
	return dbUserToZeniDBUser(user), nil
}

// Participate implements zeni.DB.
func (g *gormZenaoDB) Participate(eventID string, buyerID string, userID string, ticketSecret string, password string, needPassword bool) error {
	g, span := g.trace("gzdb.Participate")
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

	var participantsCount int64
	if err := g.db.Model(&SoldTicket{}).Where("event_id = ?", evt.ID).Count(&participantsCount).Error; err != nil {
		return err
	}

	remaining := int64(evt.Capacity) - participantsCount
	if remaining <= 0 {
		return errors.New("sold out")
	}

	var count int64
	if err := g.db.Model(&SoldTicket{}).Where("event_id = ? AND user_id = ?", evt.ID, userIDint).Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return errors.New("user is already participant for this event")
	}

	if err := g.db.Create(&SoldTicket{
		EventID: evt.ID,
		BuyerID: uint(buyerIDint),
		UserID:  uint(userIDint),
		Secret:  ticket.Secret(),
		Pubkey:  ticket.Pubkey(),
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

	if err := g.db.Save(participant).Error; err != nil {
		return err
	}

	return nil
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

// EditUser implements zeni.DB.
func (g *gormZenaoDB) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	// XXX: validate?
	if err := g.db.Model(&User{}).Where("id = ?", userID).Updates(User{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}).Error; err != nil {
		return err
	}
	return nil
}

// PromoteUser implements zeni.DB.
func (g *gormZenaoDB) PromoteUser(userID string, plan zeni.Plan) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	if !plan.IsValid() {
		return fmt.Errorf("invalid plan: %s", plan)
	}

	return g.db.Model(&User{}).Where("id = ?", userIDInt).Update("plan", string(plan)).Error
}

// UserExists implements zeni.DB.
func (g *gormZenaoDB) GetUser(authID string) (*zeni.User, error) {
	var user User
	if err := g.db.Where("auth_id = ?", authID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return dbUserToZeniDBUser(&user), nil
}

// GetAllUsers implements zeni.DB.
func (g *gormZenaoDB) GetAllUsers() ([]*zeni.User, error) {
	var users []*User
	if err := g.db.Find(&users).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		res = append(res, dbUserToZeniDBUser(u))
	}
	return res, nil
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

// GetOrgUsersWithRole implements zeni.DB.
func (g *gormZenaoDB) GetOrgUsersWithRole(orgType string, orgID string, role string) ([]*zeni.User, error) {
	g, span := g.trace("gzdb.GetOrgUsersWithRole")
	defer span.End()

	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ?",
			orgType, orgID, role, zeni.EntityTypeUser).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []*zeni.User{}, nil
	}

	userIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		userIDs = append(userIDs, r.EntityID)
	}

	var users []User
	if err := g.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		result = append(result, dbUserToZeniDBUser(&u))
	}

	return result, nil
}

// GetOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ?",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
}

// GetDeletedOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetDeletedOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Unscoped().
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ? AND deleted_at IS NOT NULL",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
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

func (g *gormZenaoDB) GetOrgUsers(orgType string, orgID string) ([]*zeni.User, error) {
	g, span := g.trace("gzdb.GetOrgUsers")
	defer span.End()

	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND entity_type = ?",
			orgType, orgID, zeni.EntityTypeUser).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []*zeni.User{}, nil
	}
	userIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		userIDs = append(userIDs, r.EntityID)
	}
	var users []User
	if err := g.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		result = append(result, dbUserToZeniDBUser(&u))
	}
	return result, nil
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

func (g *gormZenaoDB) EntityRoles(entityType string, entityID string, orgType string, orgID string) ([]string, error) {
	var roles []EntityRole

	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id = ?",
			entityType, entityID, orgType, orgID).
		Find(&roles).Error; err != nil {
		return nil, err
	}

	res := make([]string, 0, len(roles))
	for _, role := range roles {
		res = append(res, role.Role)
	}

	return res, nil
}

// CreateCommunity implements zeni.DB.
func (g *gormZenaoDB) CreateCommunity(creatorID string, administratorsIDs []string, membersIDs []string, eventsIDs []string, req *zenaov1.CreateCommunityRequest) (*zeni.Community, error) {
	g, span := g.trace("gzdb.CreateCommunity")
	defer span.End()

	creatorIDInt, err := strconv.ParseUint(creatorID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse creator id: %w", err)
	}

	community := &Community{
		DisplayName: req.DisplayName,
		Description: req.Description,
		AvatarURI:   req.AvatarUri,
		BannerURI:   req.BannerUri,
		CreatorID:   uint(creatorIDInt),
	}

	if err := g.db.Create(community).Error; err != nil {
		return nil, fmt.Errorf("create community in db: %w", err)
	}

	for _, adminID := range administratorsIDs {
		adminIDInt, err := strconv.ParseUint(adminID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse admin id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(adminIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleAdministrator,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create administrator role assignment in db: %w", err)
		}
	}

	for _, memberID := range membersIDs {
		memberIDInt, err := strconv.ParseUint(memberID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse member id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(memberIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleMember,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create member role assignment in db: %w", err)
		}
	}

	for _, eventID := range eventsIDs {
		eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse event id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeEvent,
			EntityID:   uint(eventIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleEvent,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create event role assignment in db: %w", err)
		}
	}

	zcmt, err := dbCommunityToZeniCommunity(community)
	if err != nil {
		return nil, fmt.Errorf("convert db community to zeni community: %w", err)
	}

	return zcmt, nil
}

// EditCommunity implements zeni.DB.
func (g *gormZenaoDB) EditCommunity(communityID string, administratorsIDs []string, req *zenaov1.EditCommunityRequest) (*zeni.Community, error) {
	g, span := g.trace("gzdb.EditCommunity")
	defer span.End()

	cmtIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse community id: %w", err)
	}

	cmt := Community{
		DisplayName: req.DisplayName,
		Description: req.Description,
		AvatarURI:   req.AvatarUri,
		BannerURI:   req.BannerUri,
	}

	if err := g.updateUserRoles(zeni.RoleAdministrator, administratorsIDs, communityID, zeni.EntityTypeCommunity); err != nil {
		return nil, err
	}

	// NOTE: Administrators are also members of the community (members is like a base role for entity of user type)
	// Main reason for this is to simplify the registry as a simple list of members, without having to deal with roles.
	for _, adminID := range administratorsIDs {
		adminIDInt, err := strconv.ParseUint(adminID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse admin id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(adminIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      uint(cmtIDInt),
			Role:       zeni.RoleMember,
		}

		if err := g.db.Save(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create member role assignment in db: %w", err)
		}
	}

	if err := g.db.Model(&Community{}).Where("id = ?", cmtIDInt).Updates(cmt).Error; err != nil {
		return nil, fmt.Errorf("update community in db: %w", err)
	}

	dbcmt, err := g.getDBCommunity(communityID)
	if err != nil {
		return nil, fmt.Errorf("get community from db: %w", err)
	}

	zcmt, err := dbCommunityToZeniCommunity(dbcmt)
	if err != nil {
		return nil, fmt.Errorf("convert db community to zeni community: %w", err)
	}

	return zcmt, nil
}

// AddMemberToCommunity implements zeni.DB.
func (g *gormZenaoDB) AddMemberToCommunity(communityID string, userID string) error {
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}

	entityRole := &EntityRole{
		EntityType: zeni.EntityTypeUser,
		EntityID:   uint(userIDInt),
		OrgType:    zeni.EntityTypeCommunity,
		OrgID:      uint(communityIDInt),
		Role:       zeni.RoleMember,
	}

	if err := g.db.Save(entityRole).Error; err != nil {
		return fmt.Errorf("create member role assignment in db: %w", err)
	}

	return nil
}

// RemoveMemberFromCommunity implements zeni.DB.
// Remove all roles of the member in the community.
func (g *gormZenaoDB) RemoveMemberFromCommunity(communityID string, userID string) error {
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}

	if err := g.db.
		Model(&EntityRole{}).Where("org_type = ? AND org_id = ? AND entity_type = ? AND entity_id = ?",
		zeni.EntityTypeCommunity, communityIDInt, zeni.EntityTypeUser, userIDInt).
		Delete(&EntityRole{}).Error; err != nil {
		return fmt.Errorf("delete member role assignment in db: %w", err)
	}

	return nil
}

// GetCommunity implements zeni.DB.
func (g *gormZenaoDB) GetCommunity(communityID string) (*zeni.Community, error) {
	cmt, err := g.getDBCommunity(communityID)
	if err != nil {
		return nil, err
	}
	return dbCommunityToZeniCommunity(cmt)
}

// GetAllCommunities implements zeni.DB.
func (g *gormZenaoDB) GetAllCommunities() ([]*zeni.Community, error) {
	var communities []*Community
	if err := g.db.Find(&communities).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Community, 0, len(communities))
	for _, c := range communities {
		zcmt, err := dbCommunityToZeniCommunity(c)
		if err != nil {
			return nil, err
		}
		res = append(res, zcmt)
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

	roles, err := g.EntityRoles(zeni.EntityTypeUser, fmt.Sprintf("%d", dbTicket.UserID), zeni.EntityTypeEvent, fmt.Sprint(dbTicket.EventID))
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

// AddEventToCommunity implements zeni.DB.
func (g *gormZenaoDB) AddEventToCommunity(eventID string, communityID string) error {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse event id: %w", err)
	}
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}

	entityRole := &EntityRole{
		EntityType: zeni.EntityTypeEvent,
		EntityID:   uint(eventIDInt),
		OrgType:    zeni.EntityTypeCommunity,
		OrgID:      uint(communityIDInt),
		Role:       zeni.RoleEvent,
	}

	if err := g.db.Save(entityRole).Error; err != nil {
		return fmt.Errorf("create event role assignment in db: %w", err)
	}

	return nil
}

// RemoveEventFromCommunity implements zeni.DB.
func (g *gormZenaoDB) RemoveEventFromCommunity(eventID string, communityID string) error {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse event id: %w", err)
	}
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id = ?",
			zeni.EntityTypeEvent, eventIDInt, zeni.EntityTypeCommunity, communityIDInt).
		Delete(&EntityRole{}).Error; err != nil {
		return fmt.Errorf("delete event role assignment in db: %w", err)
	}
	return nil
}

// CommunitiesByEvent implements zeni.DB.
func (g *gormZenaoDB) CommunitiesByEvent(eventID string) ([]*zeni.Community, error) {
	g, span := g.trace("gzdb.CommunitiesByEvent")
	defer span.End()

	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	var roles []EntityRole
	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ?",
			zeni.EntityTypeEvent, eventIDInt, zeni.EntityTypeCommunity).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []*zeni.Community{}, nil
	}

	communityIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		communityIDs = append(communityIDs, r.OrgID)
	}

	var communities []Community
	if err := g.db.Where("id IN ?", communityIDs).Find(&communities).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.Community, 0, len(communities))
	for _, c := range communities {
		zcmt, err := dbCommunityToZeniCommunity(&c)
		if err != nil {
			return nil, fmt.Errorf("convert db community to zeni community: %w", err)
		}
		result = append(result, zcmt)
	}
	return result, nil
}

func dbUserToZeniDBUser(dbuser *User) *zeni.User {
	return &zeni.User{
		ID:          fmt.Sprintf("%d", dbuser.ID),
		CreatedAt:   dbuser.CreatedAt,
		DisplayName: dbuser.DisplayName,
		Bio:         dbuser.Bio,
		AvatarURI:   dbuser.AvatarURI,
		AuthID:      dbuser.AuthID,
		Plan:        zeni.Plan(dbuser.Plan),
	}
}

func dbEntityRoleToZeniEntityRole(dbrole *EntityRole) *zeni.EntityRole {
	er := &zeni.EntityRole{
		CreatedAt:  dbrole.CreatedAt,
		EntityType: dbrole.EntityType,
		EntityID:   fmt.Sprintf("%d", dbrole.EntityID),
		OrgType:    dbrole.OrgType,
		OrgID:      fmt.Sprintf("%d", dbrole.OrgID),
		Role:       dbrole.Role,
	}
	if dbrole.DeletedAt.Valid {
		er.DeletedAt = dbrole.DeletedAt.Time
	}
	return er
}

func dbSoldTicketToZeniSoldTicket(dbtick *SoldTicket) (*zeni.SoldTicket, error) {
	tickobj, err := zeni.NewTicketFromSecret(dbtick.Secret)
	if err != nil {
		return nil, err
	}
	var checkin *zeni.Checkin
	if dbtick.Checkin != nil {
		checkin = &zeni.Checkin{
			At:           dbtick.Checkin.CreatedAt,
			GatekeeperID: fmt.Sprint(dbtick.Checkin.GatekeeperID),
			Signature:    dbtick.Checkin.Signature,
		}
	}
	var user *zeni.User
	if dbtick.User != nil {
		user = dbUserToZeniDBUser(dbtick.User)
	}
	ticket := &zeni.SoldTicket{
		Ticket:    tickobj,
		BuyerID:   fmt.Sprint(dbtick.BuyerID),
		UserID:    fmt.Sprint(dbtick.UserID),
		Checkin:   checkin,
		User:      user,
		CreatedAt: dbtick.CreatedAt,
	}
	if dbtick.DeletedAt.Valid {
		ticket.DeletedAt = dbtick.DeletedAt.Time
	}
	return ticket, nil
}

// updateUserRoles updates the users having the given role in the given org (orgType and orgID).
// It adds the role to the users in userIDs that do not have it yet, and removes the role from the users that are not in userIDs.
func (g *gormZenaoDB) updateUserRoles(role string, userIDs []string, orgID string, orgType string) error {
	orgIDInt, err := strconv.ParseUint(orgID, 10, 64)
	if err != nil {
		return err
	}

	var currentUsersIDs []string
	currentUsers, err := g.GetOrgUsersWithRole(orgType, orgID, role)
	if err != nil {
		return fmt.Errorf("get users with role %s: %w", role, err)
	}
	for _, usr := range currentUsers {
		currentUsersIDs = append(currentUsersIDs, usr.ID)
	}

	usersToRemove := make([]string, 0, len(currentUsers))
	for _, userID := range currentUsersIDs {
		if !slices.Contains(userIDs, userID) {
			usersToRemove = append(usersToRemove, userID)
		}
	}
	if len(usersToRemove) > 0 {
		if err := g.db.
			Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ? AND entity_id IN ?",
				orgType, orgID, role, zeni.EntityTypeUser, usersToRemove).
			Delete(&EntityRole{}).Error; err != nil {
			return fmt.Errorf("delete existing %s roles before adding the new ones: %w", role, err)
		}
	}

	usersToAdd := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		if !slices.Contains(currentUsersIDs, userID) {
			usersToAdd = append(usersToAdd, userID)
		}
	}

	for _, userID := range usersToAdd {
		userIDInt, err := strconv.ParseUint(userID, 10, 64)
		if err != nil {
			return fmt.Errorf("parse %s id: %w", role, err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(userIDInt),
			OrgType:    orgType,
			OrgID:      uint(orgIDInt),
			Role:       role,
		}

		if err := g.db.Save(entityRole).Error; err != nil {
			return fmt.Errorf("create %s role assignment in db: %w", role, err)
		}
	}
	return nil
}

func (g *gormZenaoDB) trace(label string) (*gormZenaoDB, trace.Span) {
	ctx, span := otel.Tracer("gzdb").Start(
		g.db.Statement.Context,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	return g.withContext(ctx), span
}
