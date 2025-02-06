package events

import (
	"errors"
	"std"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/zenao/dao_roles_based"
)

type Event struct {
	ID               string
	Creator          string
	StartDate        int64
	EndDate          int64
	Capacity         uint64
	Location         string
	GetProfileString GetProfileString
	SetProfileString SetProfileString
	Org              *dao_roles_based.DaoRolesBased
}

type Config struct {
	Creator          string
	Title            string
	Description      string
	ImageURI         string
	StartDate        int64 // unix seconds
	EndDate          int64 // unix seconds
	Capacity         uint64
	GetProfileString GetProfileString
	SetProfileString SetProfileString
	ZenaoAdminAddr   string
	Location         string
}

type GetProfileString func(addr std.Address, field string, def string) string

type SetProfileString func(field string, value string) bool

func NewEvent(conf *Config) *Event {
	roles := []string{"organizer", "gatekeeper", "participant"}
	members := [][]string{
		{conf.Creator, "organizer"},
		{conf.ZenaoAdminAddr, "organizer"},
	}

	var resourcesJSON = `[{"resource":"init","condition":{"type":"role-count","role":"organizer","count":"1"}}]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON(conf.Title, conf.Description, roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	event := &Event{
		Creator:          conf.Creator,
		StartDate:        conf.StartDate,
		EndDate:          conf.EndDate,
		Capacity:         conf.Capacity,
		GetProfileString: conf.GetProfileString,
		SetProfileString: conf.SetProfileString,
		Org:              dao,
		Location:         conf.Location,
	}

	conf.SetProfileString("DisplayName", conf.Title)
	conf.SetProfileString("Bio", conf.Description)
	conf.SetProfileString("Avatar", conf.ImageURI)

	return event
}

func (e *Event) AddParticipant(participant string) {
	if e.Org.MemberModule.CountMemberRoles(participant) > 0 {
		typeAddRole := dao_roles_based.NewAddRoleToUserMessageHandler(nil).Type()
		proposalAddParticipantJSON := `{"title":"add participant","description":"no description","message":{"type":"` + typeAddRole + `","payload":{"address":"` + participant + `", "role":"participant"}}}`
		e.Org.InstantExecute(proposalAddParticipantJSON)
	} else {
		typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
		proposalAddMemberJSON := `{"title":"add member with participant role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + participant + `","roles":["participant"]}}}`
		e.Org.InstantExecute(proposalAddMemberJSON)
	}
}

func (e *Event) RemoveParticipant(participant string) {
	if e.Org.MemberModule.CountMemberRoles(participant) > 1 {
		typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
		proposalRemoveParticipantJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + participant + `", "role":"participant"}}}`
		e.Org.InstantExecute(proposalRemoveParticipantJSON)
	} else {
		typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
		proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":"` + participant + `"}}`
		e.Org.InstantExecute(proposalRemoveMemberJSON)
	}
}

func (e *Event) AddGatekeeper(gatekeeper string) {
	if e.Org.MemberModule.CountMemberRoles(gatekeeper) > 0 {
		typeAddRole := dao_roles_based.NewAddRoleToUserMessageHandler(nil).Type()
		proposalAddGatekeeperJSON := `{"title":"add gatekeeper","description":"no description","message":{"type":"` + typeAddRole + `","payload":{"address":"` + gatekeeper + `", "role":"gatekeeper"}}}`
		e.Org.InstantExecute(proposalAddGatekeeperJSON)
	} else {
		typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
		proposalAddMemberJSON := `{"title":"add member with gatekeeper role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + gatekeeper + `","roles":["gatekeeper"]}}}`
		e.Org.InstantExecute(proposalAddMemberJSON)
	}
}

func (e *Event) RemoveGatekeeper(gatekeeper string) {
	if e.Org.MemberModule.CountMemberRoles(gatekeeper) > 1 {
		typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
		proposalRemoveGatekeeperJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + gatekeeper + `", "role":"gatekeeper"}}}`
		e.Org.InstantExecute(proposalRemoveGatekeeperJSON)
	} else {
		typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
		proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":"` + gatekeeper + `"}}`
		e.Org.InstantExecute(proposalRemoveMemberJSON)
	}
}
func (e *Event) AssertCallerIsOrganizer() {
	caller := std.PrevRealm().Addr()
	if !e.Org.MemberModule.HasRole(caller.String(), "organizer") {
		panic(errors.New("caller is not organizer"))
	}
}

func (e *Event) CountParticipants() int {
	return len(e.Org.MemberModule.GetMembersWithRole("participant"))
}

func (e *Event) Edit(title, description, imageURI string, startDate, endDate int64, capacity uint64, location string) {
	e.AssertCallerIsOrganizer()

	e.SetProfileString("DisplayName", title)
	e.SetProfileString("Bio", description)
	e.SetProfileString("Avatar", imageURI)

	e.StartDate = startDate
	e.EndDate = endDate
	e.Capacity = capacity
	e.Location = location

	// XXX: update register
}

func (e *Event) Render(path string) string {
	s := ""
	if path == "" {
		info := e.Info()
		s += md.H1(info.Title)
		s += md.Image("Event presentation", info.ImageURI)
		s += md.Paragraph(info.Description)
		s += md.BulletList([]string{
			ufmt.Sprintf("Time: From %s to %s", time.Unix(info.StartDate, 0).Format(time.DateTime), time.Unix(info.EndDate, 0).Format(time.DateTime)),
			ufmt.Sprintf("Capacity: %d/%d", e.CountParticipants(), e.Capacity),
			ufmt.Sprintf("Organizer: %s", e.GetProfileString(std.Address(info.Creator), "DisplayName", "")),
		}) + "\n"
		s += md.HorizontalRule()
		path = "noprofile"
	}
	s += e.Org.Render(path)
	return s
}
