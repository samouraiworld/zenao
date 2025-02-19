package events

import (
	"errors"
	"std"
	"strings"
	"time"

	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/role_manager"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

const gatewayDomain = "rose-many-bass-859.mypinata.cloud"

type Event struct {
	ID               string
	Creator          string
	StartDate        int64
	EndDate          int64
	Capacity         uint32
	Location         *zenaov1.EventLocation
	GetProfileString GetProfileString
	SetProfileString SetProfileString
	Org              *basedao.DAO
	PkgPath          string
}

type Config struct {
	Creator          string
	Title            string
	Description      string
	ImageURI         string
	StartDate        int64 // unix seconds
	EndDate          int64 // unix seconds
	Capacity         uint32
	GetProfileString GetProfileString
	SetProfileString SetProfileString
	ZenaoAdminAddr   string
	Location         *zenaov1.EventLocation
}

type GetProfileString func(addr std.Address, field string, def string) string
type SetProfileString func(field string, value string) bool

func NewEvent(conf *Config) *Event {
	roles := []role_manager.RoleInfo{
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
			Roles:   []string{"organizer"},
		},
	}

	memberStore := basedao.NewMembersStore(roles, members)
	organizerCond := daocond.RoleCount(1, "organizer", memberStore.HasRole)

	dao := basedao.New(&basedao.Config{
		Name:              conf.Title,
		Description:       conf.Description,
		NoDefaultHandlers: false,
		Members:           memberStore,
		SetProfileString:  basedao.ProfileStringSetter(conf.SetProfileString),
		GetProfileString:  basedao.ProfileStringGetter(conf.GetProfileString),
		InitialCondition:  organizerCond,
		NoEvents:          false,
	})

	event := &Event{
		Creator:          conf.Creator,
		StartDate:        conf.StartDate,
		EndDate:          conf.EndDate,
		Capacity:         conf.Capacity,
		GetProfileString: conf.GetProfileString,
		SetProfileString: conf.SetProfileString,
		Org:              dao,
		Location:         conf.Location,
		// XXX: set PkgPath?
	}

	return event
}

func (e *Event) AddParticipant(participant string) {
	if e.Org.Members.CountMemberRoles(participant) > 0 {
		proposal := daokit.ProposalRequest{
			Title:       "add participant",
			Description: "no description",
			Message: basedao.NewAssignRoleMsg(&basedao.MsgAssignRole{
				Address: std.Address(participant),
				Role:    "participant",
			}),
		}
		e.Org.InstantExecute(proposal)
	} else {
		proposal := daokit.ProposalRequest{
			Title:       "add member with participant role",
			Description: "no description",
			Message: basedao.NewAddMemberMsg(&basedao.MsgAddMember{
				Address: std.Address(participant),
				Roles:   []string{"participant"},
			}),
		}
		e.Org.InstantExecute(proposal)
	}
}

func (e *Event) RemoveParticipant(participant string) {
	if e.Org.Members.CountMemberRoles(participant) > 1 {
		proposal := daokit.ProposalRequest{
			Title:       "remove participant",
			Description: "no description",
			Message: basedao.NewUnassignRoleMsg(&basedao.MsgUnassignRole{
				Address: std.Address(participant),
				Role:    "participant",
			}),
		}
		e.Org.InstantExecute(proposal)
	} else {
		proposal := daokit.ProposalRequest{
			Title:       "remove member",
			Description: "no description",
			Message:     basedao.NewRemoveMemberMsg(std.Address(participant)),
		}
		e.Org.InstantExecute(proposal)
	}
}

func (e *Event) AddGatekeeper(gatekeeper string) {
	if e.Org.Members.CountMemberRoles(gatekeeper) > 0 {
		proposal := daokit.ProposalRequest{
			Title:       "add gatekeeper",
			Description: "no description",
			Message: basedao.NewAssignRoleMsg(&basedao.MsgAssignRole{
				Address: std.Address(gatekeeper),
				Role:    "gatekeeper",
			}),
		}
		e.Org.InstantExecute(proposal)
	} else {
		proposal := daokit.ProposalRequest{
			Title:       "add member with gatekeeper role",
			Description: "no description",
			Message: basedao.NewAddMemberMsg(&basedao.MsgAddMember{
				Address: std.Address(gatekeeper),
				Roles:   []string{"gatekeeper"},
			}),
		}
		e.Org.InstantExecute(proposal)
	}
}

func (e *Event) RemoveGatekeeper(gatekeeper string) {
	if e.Org.Members.CountMemberRoles(gatekeeper) > 1 {
		proposal := daokit.ProposalRequest{
			Title:       "remove gatekeeper",
			Description: "no description",
			Message: basedao.NewUnassignRoleMsg(&basedao.MsgUnassignRole{
				Address: std.Address(gatekeeper),
				Role:    "gatekeeper",
			}),
		}
		e.Org.InstantExecute(proposal)
	} else {
		proposal := daokit.ProposalRequest{
			Title:       "remove member",
			Description: "no description",
			Message:     basedao.NewRemoveMemberMsg(std.Address(gatekeeper)),
		}
		e.Org.InstantExecute(proposal)
	}
}
func (e *Event) AssertCallerIsOrganizer() {
	caller := std.PrevRealm().Addr()
	if !e.Org.Members.HasRole(caller.String(), "organizer") {
		panic(errors.New("caller is not organizer"))
	}
}

func (e *Event) CountParticipants() uint32 {
	return uint32(len(e.Org.Members.GetMembersWithRole("participant")))
}

func (e *Event) Edit(title, description, imageURI string, startDate, endDate int64, capacity uint32, locationJSON string) {
	e.AssertCallerIsOrganizer()

	e.SetProfileString("DisplayName", title)
	e.SetProfileString("Bio", description)
	e.SetProfileString("Avatar", imageURI)

	e.StartDate = startDate
	e.EndDate = endDate
	e.Capacity = capacity

	parsedLoc := json.Must(json.Unmarshal([]byte(locationJSON)))
	e.Location = &zenaov1.EventLocation{}
	e.Location.FromJSON(parsedLoc)

	// XXX: update registry
}

func (e *Event) Render(path string) string {
	// XXX: render location

	s := ""
	if path == "" {
		info := e.Info()

		locStr, err := LocationString(e.Location)
		if err != nil {
			locStr = "Error: " + err.Error()
		}

		orga := e.GetProfileString(std.Address(info.Creator), "DisplayName", "")
		if orga == "" {
			orga = info.Creator
		}

		s += md.H1(info.Title)
		s += md.Image("Event presentation", eventImageURL(info.ImageUri))
		s += md.Paragraph(info.Description)
		s += md.BulletList([]string{
			ufmt.Sprintf("📍 Location: %s", locStr),
			ufmt.Sprintf("🕓 Time: From %s to %s", time.Unix(info.StartDate, 0).Format(time.DateTime), time.Unix(info.EndDate, 0).Format(time.DateTime)),
			ufmt.Sprintf("🎫 Capacity: %d/%d", e.CountParticipants(), e.Capacity),
			ufmt.Sprintf("👤 Organizer: %s", md.Link(orga, "/r/zenao/cockpit:u/"+info.Creator)),
		}) + "\n"
		s += md.HorizontalRule()
		path = "noprofile"
	}
	s += e.Org.Render(path)
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
