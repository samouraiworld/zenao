package events

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"std"
	"strconv"
	"strings"
	"time"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/role_manager"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

const gatewayDomain = "rose-many-bass-859.mypinata.cloud"

// Event can be exposed
type Event struct {
	id               string
	creator          string
	startDate        int64
	endDate          int64
	capacity         uint32
	tickets          avl.Tree // ticketHash -> *Ticket
	location         *zenaov1.EventLocation
	getProfileString basedao.ProfileStringGetter
	setProfileString basedao.ProfileStringSetter
	DAOPrivate       *basedao.DAOPrivate
	DAO              daokit.DAO
	pkgPath          string
}

type Config struct {
	Creator          string
	Title            string
	Description      string
	ImageURI         string
	StartDate        int64 // unix seconds
	EndDate          int64 // unix seconds
	Capacity         uint32
	GetProfileString basedao.ProfileStringGetter
	SetProfileString basedao.ProfileStringSetter
	ZenaoAdminAddr   string
	Location         *zenaov1.EventLocation
}

type Ticket struct {
	Participant string
	UsedAt      *time.Time
}

func (t *Ticket) Used() bool {
	return t.UsedAt != nil
}

func NewEvent(conf *Config) *Event {
	roles := []role_manager.RoleInfo{
		{
			Name:        "zenao-admin",
			Description: "Admin responsible for managing the DAO until it becomes self-custodial",
		},
		{
			Name:        "organizer",
			Description: "Person in charge of the organization of the event",
		},
		{
			Name:        "gatekeeper",
			Description: "Person in charge of the event's security & access control",
		},
		{
			Name:        "participant",
			Description: "Person attending the event",
		},
	}
	members := []basedao.Member{
		{
			Address: conf.Creator,
			Roles:   []string{"organizer"},
		},
		{
			Address: conf.ZenaoAdminAddr,
			Roles:   []string{"zenao-admin"},
		},
	}

	memberStore := basedao.NewMembersStore(roles, members)
	adminCond := daocond.RoleCount(1, "zenao-admin", memberStore.HasRole)

	pubdao, privdao := basedao.New(&basedao.Config{
		Name:             conf.Title,
		Description:      conf.Description,
		ImageURI:         conf.ImageURI,
		Members:          memberStore,
		SetProfileString: basedao.ProfileStringSetter(conf.SetProfileString),
		GetProfileString: basedao.ProfileStringGetter(conf.GetProfileString),
		InitialCondition: adminCond,
	})

	event := &Event{
		creator:          conf.Creator,
		startDate:        conf.StartDate,
		endDate:          conf.EndDate,
		capacity:         conf.Capacity,
		getProfileString: conf.GetProfileString,
		setProfileString: conf.SetProfileString,
		DAOPrivate:       privdao,
		DAO:              pubdao,
		location:         conf.Location,
		// XXX: set PkgPath?
	}

	oneOrganizer := daocond.RoleCount(1, "organizer", memberStore.HasRole)
	oneGatekeeper := daocond.RoleCount(1, "gatekeeper", memberStore.HasRole)

	resources := []struct {
		cond     daocond.Condition
		handlers []daokit.MessageHandler
	}{{
		cond: oneOrganizer,
		handlers: []daokit.MessageHandler{
			event.addParticipantHandler(),
			event.removeParticipantHandler(),
			event.addGatekeeperHandler(),
			event.removeGatekeeperHandler(),
			event.editEventHandler(),
		},
	}, {
		cond: daocond.Or(oneOrganizer, oneGatekeeper),
		handlers: []daokit.MessageHandler{
			event.checkinHandler(),
		},
	}}
	for _, res := range resources {
		for _, handler := range res.handlers {
			event.DAOPrivate.Core.Resources.Set(&daokit.Resource{Handler: handler, Condition: res.cond})
		}
	}

	return event
}

const MsgAddParticipantKind = "gno.land/p/zenao/events.AddParticipant"

// NOTE: We are adding the participant and ticket at the same time, the ticket is linked to the participant and
// thus will leak the participant arrival time when validated at the event entrance.
// As a "low tech" measure, we could add the tickets at a later time in batches to scramble a bit the links between tickets and participants.
// Or better: use a ZK scheme so that the gatekeeper only reveals a proof representing a valid
// ticket that can't be linked to a particular ticket. We should ensure that there is only one valid proof for each ticket

type MsgAddParticipant struct {
	Participant  string
	TicketPubkey string // ed25519 public key derived from the private key in the ticket secret
}

func (msg *MsgAddParticipant) String() string {
	name := msg.Participant
	if name == "" {
		name = "anon"
	}
	return ufmt.Sprintf("Add %s as participant")
}

func (e *Event) addParticipantHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgAddParticipantKind, func(i interface{}) {
		msg, ok := i.(*MsgAddParticipant)
		if !ok {
			panic(errors.New("invalid payload type"))
		}

		if e.tickets.Has(msg.TicketPubkey) {
			panic(errors.New("ticket already added"))
		}

		_ = e.tickets.Set(msg.TicketPubkey, &Ticket{
			Participant: msg.Participant,
			UsedAt:      nil,
		})

		if msg.Participant == "" {
			// anonymous ticket, don't add member or role to the org
			return
		}

		if e.DAOPrivate.Members.CountMemberRoles(msg.Participant) > 0 {
			e.DAOPrivate.Members.AddRoleToMember(msg.Participant, "participant")
		} else {
			e.DAOPrivate.Members.AddMember(msg.Participant, []string{"participant"})
		}
	})
}

func NewAddParticipantMsg(participant string, ticketPubkey string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgAddParticipantKind, &MsgAddParticipant{Participant: participant, TicketPubkey: ticketPubkey})
}

const MsgRemoveParticipantKind = "gno.land/p/zenao/events.RemoveParticipant"

func (e *Event) removeParticipantHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgRemoveParticipantKind, func(i interface{}) {
		participant, ok := i.(string)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		if e.DAOPrivate.Members.CountMemberRoles(participant) > 1 {
			e.DAOPrivate.Members.RemoveRoleFromMember(participant, "participant")
		} else {
			e.DAOPrivate.Members.RemoveMember(participant)
		}
	})
}

func NewRemoveParticipantMsg(participant string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgRemoveParticipantKind, participant)
}

const MsgAddGatekeeperKind = "gno.land/p/zenao/events.AddGatekeeper"

func (e *Event) addGatekeeperHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgAddGatekeeperKind, func(i interface{}) {
		gatekeeper, ok := i.(string)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		if e.DAOPrivate.Members.CountMemberRoles(gatekeeper) > 0 {
			e.DAOPrivate.Members.AddRoleToMember(gatekeeper, "gatekeeper")
		} else {
			e.DAOPrivate.Members.AddMember(gatekeeper, []string{"gatekeeper"})
		}
	})
}

func NewAddGatekeeperMsg(gatekeeper string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgAddGatekeeperKind, gatekeeper)
}

const MsgRemoveGatekeeperKind = "gno.land/p/zenao/events.RemoveGatekeeper"

func (e *Event) removeGatekeeperHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgRemoveGatekeeperKind, func(i interface{}) {
		gatekeeper, ok := i.(string)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		if e.DAOPrivate.Members.CountMemberRoles(gatekeeper) != 1 {
			e.DAOPrivate.Members.RemoveRoleFromMember(gatekeeper, "gatekeeper")
		} else {
			e.DAOPrivate.Members.RemoveMember(gatekeeper)
		}
	})
}

func NewRemoveGatekeeperMsg(gatekeeper string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgRemoveGatekeeperKind, gatekeeper)
}

const MsgCheckinKind = "gno.land/p/zenao/events.Checkin"

type MsgCheckin struct {
	TicketPubkey     string
	CheckinSignature string // ed25519 signature by ticket secret of gatekeeper's bech32 address
	// XXX: add timestamp in payload to limit signature replay?
}

func (e *Event) checkinHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgCheckinKind, func(i interface{}) {
		msg, ok := i.(*MsgCheckin)
		if !ok {
			panic("invalid payload type")
		}

		pubkeyBz, err := base64.RawURLEncoding.DecodeString(msg.TicketPubkey)
		if err != nil {
			panic(err)
		}

		payloadBz := []byte(std.PreviousRealm().Address())

		signatureBz, err := base64.RawURLEncoding.DecodeString(msg.CheckinSignature)
		if err != nil {
			panic(err)
		}

		if !ed25519.Verify(pubkeyBz, payloadBz, signatureBz) {
			panic("invalid signature")
		}

		val, ok := e.tickets.Get(msg.TicketPubkey)
		if !ok {
			panic("no such ticket")
		}
		ticket := val.(*Ticket)
		if ticket.Used() {
			panic(ufmt.Sprintf("ticket already used at %s", ticket.UsedAt.Format(time.RFC3339)))
		}

		now := time.Now()
		ticket.UsedAt = &now
	})
}

func NewCheckinMsg(ticketPubkey string, checkinSignature string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgCheckinKind, &MsgCheckin{
		TicketPubkey:     ticketPubkey,
		CheckinSignature: checkinSignature,
	})
}

func (e *Event) CountParticipants() uint32 {
	return uint32(len(e.DAOPrivate.Members.GetMembersWithRole("participant")))
}

const MsgEditEventKind = "gno.land/p/zenao/events.EditEvent"

func (e *Event) editEventHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgEditEventKind, func(i interface{}) {
		msg, ok := i.(*msgEditEvent)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		if msg.title != "" {
			e.setProfileString("DisplayName", msg.title)
		}
		if msg.description != "" {
			e.setProfileString("Bio", msg.description)
		}
		if msg.imageURI != "" {
			e.setProfileString("Avatar", msg.imageURI)
		}
		if msg.startDate != 0 {
			e.startDate = msg.startDate
		}
		if msg.endDate != 0 {
			e.endDate = msg.endDate
		}
		if msg.capacity != 0 {
			e.capacity = msg.capacity
		}
		if msg.location != nil {
			e.location = msg.location
		}
	})
}

type msgEditEvent struct {
	title       string
	description string
	imageURI    string
	startDate   int64
	endDate     int64
	capacity    uint32
	location    *zenaov1.EventLocation
}

func (msg *msgEditEvent) String() string {
	elems := []string{}
	if msg.title != "" {
		elems = append(elems, "Title: "+msg.title)
	}
	if msg.description != "" {
		elems = append(elems, "Description: "+msg.description)
	}
	if msg.startDate != 0 {
		elems = append(elems, "Start date: "+time.Unix(msg.startDate, 0).Format(time.DateTime))
	}
	if msg.endDate != 0 {
		elems = append(elems, "End date: "+time.Unix(msg.endDate, 0).Format(time.DateTime))
	}
	if msg.capacity != 0 {
		elems = append(elems, "Capacity: "+strconv.FormatUint(uint64(msg.capacity), 10))
	}
	if msg.location != nil {
		locStr, err := LocationString(msg.location)
		if err != nil {
			locStr = err.Error()
		}
		elems = append(elems, "Location: "+locStr)
	}
	if msg.imageURI != "" {
		elems = append(elems, "Image: "+msg.imageURI+"\n  "+md.Image("Event presentation", eventImageURL(msg.imageURI)))
	}
	return md.BulletList(elems)
}

func NewEditEventMsg(title, description, imageURI string, startDate, endDate int64, capacity uint32, loc *zenaov1.EventLocation) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgEditEventKind, &msgEditEvent{
		title:       title,
		description: description,
		imageURI:    imageURI,
		startDate:   startDate,
		endDate:     endDate,
		capacity:    capacity,
		location:    loc,
	})
}

func (e *Event) Render(path string) string {
	s := ""
	if path == "" {
		info := e.Info()

		locStr, err := LocationString(e.location)
		if err != nil {
			locStr = "Error: " + err.Error()
		}

		orga := e.getProfileString(std.Address(info.Creator), "DisplayName", "")
		if orga == "" {
			orga = info.Creator
		}

		s += md.H1(info.Title)
		s += md.Image("Event presentation", eventImageURL(info.ImageUri))
		s += md.Paragraph(info.Description)
		s += md.BulletList([]string{
			ufmt.Sprintf("📍 Location: %s", locStr),
			ufmt.Sprintf("🕓 Time: From %s to %s", time.Unix(info.StartDate, 0).Format(time.DateTime), time.Unix(info.EndDate, 0).Format(time.DateTime)),
			ufmt.Sprintf("🎫 Capacity: %d/%d", e.CountParticipants(), e.capacity),
			ufmt.Sprintf("👤 Organizer: %s", md.Link(orga, "/r/zenao/cockpit:u/"+info.Creator)),
		}) + "\n"
		s += md.HorizontalRule()
		path = "noprofile"
	}
	s += e.DAOPrivate.Render(path)
	return s
}

func eventImageURL(uri string) string {
	if !strings.HasPrefix(uri, "ipfs://") {
		return uri
	}
	withoutScheme := strings.TrimPrefix(uri, "ipfs://")
	res := ufmt.Sprintf(`https://%s/ipfs/%s?img-width=350&img-height=250&img-fit=cover&img-dpr=2`, gatewayDomain, withoutScheme)
	return res
}

func LocationString(location *zenaov1.EventLocation) (string, error) {
	if location == nil {
		return "", errors.New("nil location")
	}

	buf := &strings.Builder{}

	if location.VenueName != "" {
		buf.WriteString(location.VenueName)
		buf.WriteString(" - ")
	}

	switch val := location.Address.(type) {
	case *zenaov1.AddressVirtual:
		buf.WriteString(val.Uri)
	case *zenaov1.AddressGeo:
		buf.WriteString(val.Address)
		buf.WriteString(ufmt.Sprintf("- %g, %g", val.Lat, val.Lng))
	case *zenaov1.AddressCustom:
		buf.WriteString(val.Address)
	default:
		return "", errors.New("unsupported address type")
	}

	return buf.String(), nil
}
