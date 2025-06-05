package gzdb

import (
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model         // this ID should be used for any database related logic (like querying)
	AuthID      string `gorm:"uniqueIndex"` // this ID should be only used for user identification & creation (auth provider id: clerk, auth0, etc)
	DisplayName string
	Bio         string
	AvatarURI   string
	Plan        string `gorm:"default:'free'"`
}

type UserRole struct {
	// gorm.Model without ID
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	UserID  uint `gorm:"primaryKey;autoIncrement:false"`
	User    User
	EventID uint `gorm:"primaryKey;autoIncrement:false"`
	Event   Event
	Role    string `gorm:"primaryKey"`
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

	return &gormZenaoDB{db: db}, nil
}

type gormZenaoDB struct {
	db *gorm.DB
}

func (g *gormZenaoDB) Tx(cb func(db zeni.DB) error) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		return cb(&gormZenaoDB{db: tx})
	})
}

// CreateEvent implements zeni.DB.
func (g *gormZenaoDB) CreateEvent(creatorID string, organizersIDs []string, req *zenaov1.CreateEventRequest) (*zeni.Event, error) {
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

		userRole := &UserRole{
			UserID:  uint(organizerIDInt),
			EventID: evt.ID,
			Role:    "organizer",
		}

		if err := g.db.Create(userRole).Error; err != nil {
			return nil, fmt.Errorf("create organizer role assignment in db: %w", err)
		}
	}

	zevt, err := dbEventToZeniEvent(evt)
	if err != nil {
		return nil, fmt.Errorf("convert db event to zeni event: %w", err)
	}

	return zevt, nil
}

// EditEvent implements zeni.DB.
func (g *gormZenaoDB) EditEvent(eventID string, organizersIDs []string, req *zenaov1.EditEventRequest) (*zeni.Event, error) {
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
		PasswordHash: passwordHash,
	}
	if err := evt.SetLocation(req.Location); err != nil {
		return nil, err
	}

	var currentOrgsIDs []string
	currentOrgs, err := g.GetEventUsersWithRole(eventID, "organizer")
	if err != nil {
		return nil, fmt.Errorf("get current organizers: %w", err)
	}
	for _, org := range currentOrgs {
		currentOrgsIDs = append(currentOrgsIDs, org.ID)
	}

	orgsToRemove := make([]string, 0, len(currentOrgs))
	for _, orgID := range currentOrgsIDs {
		if !slices.Contains(organizersIDs, orgID) {
			orgsToRemove = append(orgsToRemove, orgID)
		}
	}

	if len(orgsToRemove) > 0 {
		if err := g.db.Where("event_id = ? AND role = ? AND user_id IN (?)", evtIDInt, "organizer", orgsToRemove).Delete(&UserRole{}).Error; err != nil {
			return nil, fmt.Errorf("delete existing organizer roles before adding the new ones: %w", err)
		}
	}

	orgsToAdd := make([]string, 0, len(organizersIDs))
	for _, orgID := range organizersIDs {
		if !slices.Contains(currentOrgsIDs, orgID) {
			orgsToAdd = append(orgsToAdd, orgID)
		}
	}

	for _, organizerID := range orgsToAdd {
		organizerIDInt, err := strconv.ParseUint(organizerID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse organizer id: %w", err)
		}

		userRole := &UserRole{
			UserID:  uint(organizerIDInt),
			EventID: uint(evtIDInt),
			Role:    "organizer",
		}

		if err := g.db.Create(userRole).Error; err != nil {
			return nil, fmt.Errorf("create organizer role assignment in db: %w", err)
		}
	}

	if err := g.db.Model(&Event{}).Where("id = ?", evtIDInt).Updates(evt).Error; err != nil {
		return nil, err
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

func (g *gormZenaoDB) GetEventByPollID(pollID string) (*zeni.Event, error) {
	pollIDInt, err := strconv.ParseUint(pollID, 10, 64)
	if err != nil {
		return nil, err
	}

	var poll Poll
	if err := g.db.Where("id = ?", pollIDInt).Preload("Post").Preload("Post.Feed").Preload("Post.Feed.Event").First(&poll).Error; err != nil {
		return nil, err
	}

	return dbEventToZeniEvent(&poll.Post.Feed.Event)
}

func (g *gormZenaoDB) GetEventByPostID(postID string) (*zeni.Event, error) {
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}

	var post Post
	if err := g.db.Where("id = ?", postIDInt).Preload("Feed").Preload("Feed.Event").First(&post).Error; err != nil {
		return nil, err
	}

	return dbEventToZeniEvent(&post.Feed.Event)
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
	if err := g.db.Model(&SoldTicket{}).Where("event_id = ? AND buyer_id = ?", evt.ID, userIDint).Count(&count).Error; err != nil {
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

	if err := g.db.Model(&UserRole{}).Where("event_id = ? AND user_id = ? and role = ?", evt.ID, userID, "participant").Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return errors.New("user is already participant for this event")
	}

	participant := &UserRole{
		UserID:  uint(userIDint),
		EventID: evt.ID,
		Role:    "participant",
	}

	if err := g.db.Create(participant).Error; err != nil {
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

// GetEventUsersWithRole implements zeni.DB.
func (g *gormZenaoDB) GetEventUsersWithRole(eventID string, role string) ([]*zeni.User, error) {
	var participants []*UserRole
	if err := g.db.Preload("User").Find(&participants, "event_id = ? AND role = ?", eventID, role).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.User, 0, len(participants))
	for _, p := range participants {
		res = append(res, dbUserToZeniDBUser(&p.User))
	}
	return res, nil
}

// GetEventUserTickets implements zeni.DB
func (g *gormZenaoDB) GetEventUserTickets(eventID string, userID string) ([]*zeni.SoldTicket, error) {
	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	tickets := []*SoldTicket{}
	err = g.db.Model(&SoldTicket{}).Preload("Checkin").Preload("User").Find(&tickets, "event_id = ? AND user_id = ?", eventID, userIDint).Error
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

// UserRoles implements zeni.DB.
func (g *gormZenaoDB) UserRoles(userID string, eventID string) ([]string, error) {
	var roles []UserRole
	if err := g.db.Find(&roles, "user_id = ? AND event_id = ?", userID, eventID).Error; err != nil {
		return nil, err
	}
	res := make([]string, 0, len(roles))
	for _, role := range roles {
		res = append(res, role.Role)
	}
	return res, nil
}

// CreateFeed implements zeni.DB.
func (g *gormZenaoDB) CreateFeed(eventID string, slug string) (*zeni.Feed, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, err
	}

	feed := &Feed{
		Slug:    slug,
		EventID: uint(evtIDInt),
	}

	if err := g.db.Create(feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(feed)
	if err != nil {
		return nil, err
	}

	return zfeed, nil
}

// GetFeed implements zeni.DB.
func (g *gormZenaoDB) GetFeed(eventID string, slug string) (*zeni.Feed, error) {
	evtIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, err
	}

	var feed Feed
	if err := g.db.Where("event_id = ? AND slug = ?", evtIDInt, slug).First(&feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(&feed)
	if err != nil {
		return nil, err
	}
	return zfeed, nil
}

// GetFeedByID implements zeni.DB.
func (g *gormZenaoDB) GetFeedByID(feedID string) (*zeni.Feed, error) {
	var feed Feed
	if err := g.db.Where("id = ?", feedID).First(&feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(&feed)
	if err != nil {
		return nil, err
	}
	return zfeed, nil
}

// CreatePost implements zeni.DB.
func (g *gormZenaoDB) CreatePost(postID string, feedID string, userID string, post *feedsv1.Post) (*zeni.Post, error) {
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}
	feedIDInt, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return nil, err
	}

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, err
	}

	var tags []Tag
	for _, tagName := range post.Tags {
		tags = append(tags, Tag{
			PostID: uint(postIDInt),
			Name:   tagName,
		})
	}

	dbPost := &Post{
		Model:     gorm.Model{ID: uint(postIDInt)},
		ParentURI: post.ParentUri,
		UserID:    uint(userIDInt),
		FeedID:    uint(feedIDInt),
		Tags:      tags,
	}

	switch v := post.Post.(type) {
	case *feedsv1.Post_Standard:
		dbPost.Kind = PostTypeStandard
		dbPost.Content = v.Standard.Content
	case *feedsv1.Post_Article:
		dbPost.Kind = PostTypeArticle
		dbPost.Title = v.Article.Title
		dbPost.Content = v.Article.Content
	case *feedsv1.Post_Link:
		dbPost.Kind = PostTypeLink
		dbPost.URI = v.Link.Uri
	case *feedsv1.Post_Image:
		dbPost.Kind = PostTypeImage
		dbPost.Title = v.Image.Title
		dbPost.Description = v.Image.Description
		dbPost.ImageURI = v.Image.ImageUri
	case *feedsv1.Post_Video:
		dbPost.Kind = PostTypeVideo
		dbPost.Title = v.Video.Title
		dbPost.Description = v.Video.Description
		dbPost.VideoURI = v.Video.VideoUri
		dbPost.ThumbnailImageURI = v.Video.ThumbnailImageUri
	case *feedsv1.Post_Audio:
		dbPost.Kind = PostTypeAudio
		dbPost.Title = v.Audio.Title
		dbPost.Description = v.Audio.Description
		dbPost.AudioURI = v.Audio.AudioUri
		dbPost.ThumbnailImageURI = v.Audio.ImageUri
	default:
		return nil, fmt.Errorf("unknown post kind: %T", post.Post)
	}

	if err := g.db.Create(dbPost).Error; err != nil {
		return nil, err
	}

	zpost, err := dbPostToZeniPost(dbPost)
	if err != nil {
		return nil, err
	}
	return zpost, nil
}

// GetPostByID implements zeni.DB
func (g *gormZenaoDB) GetPostByID(postID string) (*zeni.Post, error) {
	postIDUint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse post id: %w", err)
	}

	var post Post
	if err := g.db.Preload("Reactions").Preload("Tags").First(&post, postIDUint).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("post not found: %s", postID)
		}
		return nil, err
	}

	return dbPostToZeniPost(&post)
}

// GetAllPosts implements zeni.DB.
func (g *gormZenaoDB) GetAllPosts() ([]*zeni.Post, error) {
	var posts []*Post
	if err := g.db.Preload("Reactions").Preload("Tags").Find(&posts).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Post, 0, len(posts))
	for _, p := range posts {
		zpost, err := dbPostToZeniPost(p)
		if err != nil {
			return nil, err
		}
		res = append(res, zpost)
	}
	return res, nil
}

// ReactPost implements zeni.DB.
func (g *gormZenaoDB) ReactPost(userID string, req *zenaov1.ReactPostRequest) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	postIDInt, err := strconv.ParseUint(req.PostId, 10, 64)
	if err != nil {
		return err
	}

	return g.db.Transaction(func(tx *gorm.DB) error {
		var postExists bool
		if err := tx.Model(&Post{}).Select("1").Where("id = ?", postIDInt).Scan(&postExists).Error; err != nil {
			return err
		}
		if !postExists {
			return errors.New("post not found")
		}

		var reactionExists bool
		if err := tx.Model(&Reaction{}).Select("1").Where("post_id = ? AND icon = ? AND user_id = ?", postIDInt, req.Icon, userIDInt).Scan(&reactionExists).Error; err != nil {
			return err
		}
		if reactionExists {
			if err := tx.Where("post_id = ? AND icon = ? AND user_id = ?", postIDInt, req.Icon, userIDInt).Delete(&Reaction{}).Error; err != nil {
				return err
			}
			return nil
		}
		if err := tx.Create(&Reaction{
			PostID: uint(postIDInt),
			Icon:   req.Icon,
			UserID: uint(userIDInt),
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

// CreatePoll implements zeni.DB.
func (g *gormZenaoDB) CreatePoll(userID string, pollID string, postID string, feedID string, post *feedsv1.Post, req *zenaov1.CreatePollRequest) (*zeni.Poll, error) {
	pollIDint, err := strconv.ParseUint(pollID, 10, 64)
	if err != nil {
		return nil, err
	}
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}
	feedIDInt, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return nil, err
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, err
	}

	linkPost, ok := post.Post.(*feedsv1.Post_Link)
	if !ok {
		return nil, errors.New("trying to insert a poll in database with a post that is not a link type")
	}

	dbPost := &Post{
		Model:     gorm.Model{ID: uint(postIDInt)},
		ParentURI: post.ParentUri,
		UserID:    uint(userIDInt),
		FeedID:    uint(feedIDInt),
		Kind:      PostTypeLink,
		URI:       linkPost.Link.Uri,
		Tags: []Tag{{
			PostID: uint(postIDInt),
			Name:   "poll",
		}},
	}

	dbPoll := &Poll{
		Model:    gorm.Model{ID: uint(pollIDint)},
		Question: req.Question,
		Kind:     int(req.Kind),
		Duration: req.Duration,
		Results:  []PollResult{},
		PostID:   uint(postIDInt),
	}

	for _, option := range req.Options {
		dbPoll.Results = append(dbPoll.Results, PollResult{
			Option: option,
		})
	}

	if err := g.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(dbPost).Error; err != nil {
			return err
		}
		if err := tx.Create(dbPoll).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(dbPoll)
}

// VotePoll implements zeni.DB.
func (g *gormZenaoDB) VotePoll(userID string, req *zenaov1.VotePollRequest) error {
	pollIDint, err := strconv.ParseUint(req.PollId, 10, 64)
	if err != nil {
		return nil
	}
	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	return g.db.Transaction(func(tx *gorm.DB) error {
		var poll Poll
		if err := tx.Where("id = ?", pollIDint).Preload("Results").First(&poll).Error; err != nil {
			return err
		}

		var selectedResult PollResult
		if err := tx.Where("poll_id = ? AND option = ?", pollIDint, req.Option).First(&selectedResult).Error; err != nil {
			return err
		}

		// usage of table since i did not create a custom model for many2many relation
		var userVoteCount int64
		if err := tx.Table("poll_votes").Where("poll_result_id = ? AND user_id = ?", selectedResult.ID, userIDint).Count(&userVoteCount).Error; err != nil {
			return err
		}

		if userVoteCount > 0 {
			if err := tx.Table("poll_votes").Where("poll_result_id = ? AND user_id = ?", selectedResult.ID, userIDint).Delete(nil).Error; err != nil {
				return err
			}
		} else {
			if poll.Kind == int(pollsv1.PollKind_POLL_KIND_SINGLE_CHOICE) {
				if err := tx.Table("poll_votes").Where("user_id = ? AND poll_result_id IN (SELECT id FROM poll_results WHERE poll_id = ?)", userIDint, pollIDint).Delete(nil).Error; err != nil {
					return err
				}
			}
			if err := tx.Table("poll_votes").Create(map[string]interface{}{
				"poll_result_id": selectedResult.ID,
				"user_id":        userIDint,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (g *gormZenaoDB) GetPollByPostID(postID string) (*zeni.Poll, error) {
	postIDint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}

	var poll Poll
	if err := g.db.Where("post_id = ?", postIDint).Preload("Results").Preload("Results.Users").First(&poll).Error; err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(&poll)
}

// Checkin implements zeni.DB.
func (g *gormZenaoDB) Checkin(pubkey string, gatekeeperID string, signature string) (*zeni.Event, error) {
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

	roles, err := g.UserRoles(gatekeeperID, fmt.Sprint(dbTicket.EventID))
	if err != nil {
		return nil, err
	}
	if !slices.Contains(roles, "gatekeeper") && !slices.Contains(roles, "organizer") {
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
	return &zeni.SoldTicket{
		Ticket:    tickobj,
		BuyerID:   fmt.Sprint(dbtick.BuyerID),
		UserID:    fmt.Sprint(dbtick.UserID),
		Checkin:   checkin,
		User:      user,
		CreatedAt: dbtick.CreatedAt,
	}, nil
}
