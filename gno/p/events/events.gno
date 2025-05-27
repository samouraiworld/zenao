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
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

const gatewayDomain = "rose-many-bass-859.mypinata.cloud"

// XXX: consider including a nonce unique to event in signed messages (checkin and participate)

// Event cannot be exposed
type Event struct {
	creator             string
	startDate           int64
	endDate             int64
	capacity            uint32
	tickets             avl.Tree // ticketHash -> *Ticket
	location            *zenaov1.EventLocation
	getProfileString    basedao.ProfileStringGetter
	setProfileString    basedao.ProfileStringSetter
	DAOPrivate          *basedao.DAOPrivate
	DAO                 daokit.DAO
	participationPubkey []byte // ed25519 pubkey of secret key derived from event password, event is private if set
}

type Config struct {
	Creator             string
	Title               string
	Description         string
	ImageURI            string
	StartDate           int64 // unix seconds
	EndDate             int64 // unix seconds
	Capacity            uint32
	GetProfileString    basedao.ProfileStringGetter
	SetProfileString    basedao.ProfileStringSetter
	ZenaoAdminAddr      string
	Location            *zenaov1.EventLocation
	ParticipationPubkey string // ed25519 pubkey of secret key derived from event password, event is private if set
}

type Ticket struct {
	Participant string
	UsedAt      *time.Time
}

func (t *Ticket) Used() bool {
	return t.UsedAt != nil
}

func NewEvent(conf *Config) *Event {
	var participationPubkey []byte
	if conf.ParticipationPubkey != "" {
		participationPubkeyBz, err := base64.RawURLEncoding.DecodeString(conf.ParticipationPubkey)
		if err != nil {
			panic(err)
		}
		participationPubkey = participationPubkeyBz
	}

	roles := []basedao.RoleInfo{
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
		creator:             conf.Creator,
		startDate:           conf.StartDate,
		endDate:             conf.EndDate,
		capacity:            conf.Capacity,
		getProfileString:    conf.GetProfileString,
		setProfileString:    conf.SetProfileString,
		DAOPrivate:          privdao,
		DAO:                 pubdao,
		location:            conf.Location,
		participationPubkey: participationPubkey,
		// XXX: set PkgPath?
	}

	oneOrganizer := daocond.RoleCount(1, "organizer", memberStore.HasRole)
	oneGatekeeper := daocond.RoleCount(1, "gatekeeper", memberStore.HasRole)

	resources := []struct {
		cond     daocond.Condition
		handlers []daokit.ActionHandler
	}{{
		cond: oneOrganizer,
		handlers: []daokit.ActionHandler{
			event.addParticipantHandler(), // XXX: remove
			event.removeParticipantHandler(),
			event.addGatekeeperHandler(),
			event.removeGatekeeperHandler(),
			event.editEventHandler(),
		},
	}, {
		cond: daocond.Or(oneOrganizer, oneGatekeeper),
		handlers: []daokit.ActionHandler{
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

const ActionAddParticipantKind = "gno.land/p/zenao/events.AddParticipant"

// NOTE: We are adding the participant and ticket at the same time, the ticket is linked to the participant and
// thus will leak the participant arrival time when validated at the event entrance.
// As a "low tech" measure, we could add the tickets at a later time in batches to scramble a bit the links between tickets and participants.
// Or better: use a ZK scheme so that the gatekeeper only reveals a proof representing a valid
// ticket that can't be linked to a particular ticket. We should ensure that there is only one valid proof for each ticket

type ActionAddParticipant struct {
	Participant            string
	TicketPubkey           string // ed25519 public key derived from the private key in the ticket secret
	ParticipationSignature string // ed25519 signature of ticket's pubkey with secret key derived from event password
}

func (a *ActionAddParticipant) String() string {
	name := a.Participant
	if name == "" {
		name = "anon"
	}
	return ufmt.Sprintf("Add %s as participant")
}

// XXX: move to Participate(), allow anyone to use this
func (e *Event) addParticipantHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddParticipantKind, func(i interface{}) {
		a, ok := i.(*ActionAddParticipant)
		if !ok {
			panic(errors.New("invalid payload type"))
		}

		if e.tickets.Has(a.TicketPubkey) {
			panic(errors.New("ticket already added"))
		}

		callerIsOrganizer := e.DAOPrivate.Members.HasRole(std.PreviousRealm().Address().String(), "organizer")

		// XXX: this dance is not very useful for now since all accounts are managed
		// but we add this logic as PoC of on-chain password-guarded events
		if !callerIsOrganizer && len(e.participationPubkey) != 0 {
			signatureBz, err := base64.RawURLEncoding.DecodeString(a.ParticipationSignature)
			if err != nil {
				panic(err)
			}

			payloadBz := []byte(a.TicketPubkey)

			if !ed25519.Verify(e.participationPubkey, payloadBz, signatureBz) {
				panic("invalid participation signature")
			}
		}

		_ = e.tickets.Set(a.TicketPubkey, &Ticket{
			Participant: a.Participant,
			UsedAt:      nil,
		})

		if a.Participant == "" {
			// anonymous ticket, don't add member or role to the org
			return
		}

		if e.DAOPrivate.Members.CountMemberRoles(a.Participant) > 0 {
			e.DAOPrivate.Members.AddRoleToMember(a.Participant, "participant")
		} else {
			e.DAOPrivate.Members.AddMember(a.Participant, []string{"participant"})
		}
	})
}

func NewAddParticipantAction(participant string, ticketPubkey string, signature string) daokit.Action {
	return daokit.NewAction(ActionAddParticipantKind, &ActionAddParticipant{Participant: participant, TicketPubkey: ticketPubkey, ParticipationSignature: signature})
}

const ActionRemoveParticipantKind = "gno.land/p/zenao/events.RemoveParticipant"

func (e *Event) removeParticipantHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionRemoveParticipantKind, func(i interface{}) {
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

func NewRemoveParticipantAction(participant string) daokit.Action {
	return daokit.NewAction(ActionRemoveParticipantKind, participant)
}

const ActionAddGatekeeperKind = "gno.land/p/zenao/events.AddGatekeeper"

func (e *Event) addGatekeeperHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddGatekeeperKind, func(i interface{}) {
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

func NewAddGatekeeperAction(gatekeeper string) daokit.Action {
	return daokit.NewAction(ActionAddGatekeeperKind, gatekeeper)
}

const ActionRemoveGatekeeperKind = "gno.land/p/zenao/events.RemoveGatekeeper"

func (e *Event) removeGatekeeperHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionRemoveGatekeeperKind, func(i interface{}) {
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

func NewRemoveGatekeeperAction(gatekeeper string) daokit.Action {
	return daokit.NewAction(ActionRemoveGatekeeperKind, gatekeeper)
}

const ActionCheckinKind = "gno.land/p/zenao/events.Checkin"

type ActionCheckin struct {
	TicketPubkey     string
	CheckinSignature string // ed25519 signature by ticket secret of gatekeeper's bech32 address
	// XXX: add timestamp in payload to limit signature replay?
}

func (e *Event) checkinHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionCheckinKind, func(i interface{}) {
		a, ok := i.(*ActionCheckin)
		if !ok {
			panic("invalid payload type")
		}

		pubkeyBz, err := base64.RawURLEncoding.DecodeString(a.TicketPubkey)
		if err != nil {
			panic(err)
		}

		payloadBz := []byte(std.PreviousRealm().Address().String())

		signatureBz, err := base64.RawURLEncoding.DecodeString(a.CheckinSignature)
		if err != nil {
			panic(err)
		}

		if !ed25519.Verify(pubkeyBz, payloadBz, signatureBz) {
			panic("invalid signature")
		}

		val, ok := e.tickets.Get(a.TicketPubkey)
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

func NewCheckinAction(ticketPubkey string, checkinSignature string) daokit.Action {
	return daokit.NewAction(ActionCheckinKind, &ActionCheckin{
		TicketPubkey:     ticketPubkey,
		CheckinSignature: checkinSignature,
	})
}

func (e *Event) CountParticipants() uint32 {
	return uint32(len(e.DAOPrivate.Members.GetMembersWithRole("participant")))
}

const ActionEditEventKind = "gno.land/p/zenao/events.EditEvent"

func (e *Event) editEventHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionEditEventKind, func(i interface{}) {
		a, ok := i.(*actionEditEvent)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		if a.title != "" {
			e.setProfileString("DisplayName", a.title)
		}
		if a.description != "" {
			e.setProfileString("Bio", a.description)
		}
		if a.imageURI != "" {
			e.setProfileString("Avatar", a.imageURI)
		}
		if a.startDate != 0 {
			e.startDate = a.startDate
		}
		if a.endDate != 0 {
			e.endDate = a.endDate
		}
		if a.capacity != 0 {
			e.capacity = a.capacity
		}
		if a.location != nil {
			e.location = a.location
		}
		if a.privacy != nil {
			switch val := a.privacy.EventPrivacy.(type) {
			case *zenaov1.EventPrivacyPublic:
				e.participationPubkey = nil
			case *zenaov1.EventPrivacyGuarded:
				participationPubkeyBz, err := base64.RawURLEncoding.DecodeString(val.ParticipationPubkey)
				if err != nil {
					panic(err)
				}
				e.participationPubkey = participationPubkeyBz
			default:
				panic("unknown privacy model")
			}
		}
	})
}

type actionEditEvent struct {
	title       string
	description string
	imageURI    string
	startDate   int64
	endDate     int64
	capacity    uint32
	location    *zenaov1.EventLocation
	privacy     *zenaov1.EventPrivacy
}

func (a *actionEditEvent) String() string {
	elems := []string{}
	if a.title != "" {
		elems = append(elems, "Title: "+a.title)
	}
	if a.description != "" {
		elems = append(elems, "Description: "+a.description)
	}
	if a.startDate != 0 {
		elems = append(elems, "Start date: "+time.Unix(a.startDate, 0).Format(time.DateTime))
	}
	if a.endDate != 0 {
		elems = append(elems, "End date: "+time.Unix(a.endDate, 0).Format(time.DateTime))
	}
	if a.capacity != 0 {
		elems = append(elems, "Capacity: "+strconv.FormatUint(uint64(a.capacity), 10))
	}
	if a.location != nil {
		locStr, err := LocationString(a.location)
		if err != nil {
			locStr = err.Error()
		}
		elems = append(elems, "Location: "+locStr)
	}
	if a.imageURI != "" {
		elems = append(elems, "Image: "+a.imageURI+"\n  "+md.Image("Event presentation", eventImageURL(a.imageURI)))
	}
	return md.BulletList(elems)
}

func NewEditEventAction(title, description, imageURI string, startDate, endDate int64, capacity uint32, loc *zenaov1.EventLocation, privacy *zenaov1.EventPrivacy) daokit.Action {
	return daokit.NewAction(ActionEditEventKind, &actionEditEvent{
		title:       title,
		description: description,
		imageURI:    imageURI,
		startDate:   startDate,
		endDate:     endDate,
		capacity:    capacity,
		location:    loc,
		privacy:     privacy,
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
