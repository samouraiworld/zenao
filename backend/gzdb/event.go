package gzdb

import (
	"errors"
	"fmt"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type Event struct {
	gorm.Model
	Title       string
	Description string
	StartDate   time.Time
	EndDate     time.Time
	ImageURI    string
	TicketPrice float64
	Capacity    uint32
	CreatorID   uint
	Creator     User `gorm:"foreignKey:CreatorID"` // XXX: move the creator to the UserRoles table ?

	PasswordHash string // event is guarded if set

	LocVenueName    string
	LocKind         string // one of: geo, virtual or custom
	LocAddress      string // uri in virtual
	LocInstructions string // markdown

	// Specific to "custom" LocKind

	LocTimezone string

	// Specific to "geo" LocKind

	LocLat float32
	LocLng float32

	// Used to handle updates of ics file
	ICSSequenceNumber uint32 `gorm:"column:ics_sequence_number;not null;default:0"`
}

func (e *Event) SetLocation(loc *zenaov1.EventLocation) error {
	if loc == nil {
		return errors.New("nil loc")
	}

	kind, err := zeni.LocationKind(loc)
	if err != nil {
		return err
	}

	e.LocVenueName = loc.VenueName
	e.LocInstructions = loc.Instructions
	e.LocKind = kind
	e.LocAddress = ""
	e.LocTimezone = ""
	e.LocLng = 0
	e.LocLat = 0

	switch val := loc.Address.(type) {
	case *zenaov1.EventLocation_Custom:
		e.LocAddress = val.Custom.GetAddress()
		e.LocTimezone = val.Custom.Timezone
	case *zenaov1.EventLocation_Geo:
		e.LocAddress = val.Geo.GetAddress()
		e.LocLng = val.Geo.Lng
		e.LocLat = val.Geo.Lat
	case *zenaov1.EventLocation_Virtual:
		e.LocAddress = val.Virtual.GetUri()
	default:
		return errors.New("unknown address kind")
	}

	return nil
}

func dbEventToZeniEvent(dbevt *Event) (*zeni.Event, error) {
	loc := &zenaov1.EventLocation{
		VenueName:    dbevt.LocVenueName,
		Instructions: dbevt.LocInstructions,
	}

	switch dbevt.LocKind {
	case "geo":
		loc.Address = &zenaov1.EventLocation_Geo{Geo: &zenaov1.AddressGeo{
			Address: dbevt.LocAddress,
			Lng:     dbevt.LocLng,
			Lat:     dbevt.LocLat,
		}}
	case "custom":
		loc.Address = &zenaov1.EventLocation_Custom{Custom: &zenaov1.AddressCustom{
			Address:  dbevt.LocAddress,
			Timezone: dbevt.LocTimezone,
		}}
	case "virtual":
		loc.Address = &zenaov1.EventLocation_Virtual{Virtual: &zenaov1.AddressVirtual{
			Uri: dbevt.LocAddress,
		}}
	default:
		return nil, fmt.Errorf("unknown address kind %q", dbevt.LocKind)
	}

	evt := &zeni.Event{
		ID:                fmt.Sprintf("%d", dbevt.ID),
		CreatedAt:         dbevt.CreatedAt,
		Title:             dbevt.Title,
		Description:       dbevt.Description,
		StartDate:         dbevt.StartDate,
		EndDate:           dbevt.EndDate,
		ImageURI:          dbevt.ImageURI,
		TicketPrice:       dbevt.TicketPrice,
		Capacity:          dbevt.Capacity,
		CreatorID:         fmt.Sprintf("%d", dbevt.CreatorID),
		Location:          loc,
		PasswordHash:      dbevt.PasswordHash,
		ICSSequenceNumber: dbevt.ICSSequenceNumber,
	}

	if dbevt.DeletedAt.Valid {
		evt.DeletedAt = dbevt.DeletedAt.Time
	}
	return evt, nil
}
