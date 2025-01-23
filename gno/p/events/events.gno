package events

import (
	"std"

	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
	"gno.land/p/zenao/dao_roles_based"
)

type GetProfileString func(addr std.Address, field string, def string) string

type Event struct {
	ID               string
	Creator          string
	StartDate        int64
	EndDate          int64
	Capacity         uint64
	Location         string
	GetProfileString GetProfileString

	org *dao_roles_based.DaoRolesBased
}

type Config struct {
	Creator          string
	Title            string
	Description      string
	StartDate        int64 // unix seconds
	EndDate          int64 // unix seconds
	Capacity         uint64
	GetProfileString GetProfileString
	ZenaoAdminAddr   string
}

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
		org:              dao,
	}

	return event
}

func (e *Event) AddParticipant(participant string) {
	if e.org.MemberModule.CountMemberRoles(participant) > 0 {
		typeAddRole := dao_roles_based.NewAddRoleToUserMessageHandler(nil).Type()
		proposalAddParticipantJSON := `{"title":"add participant","description":"no description","message":{"type":"` + typeAddRole + `","payload":{"address":"` + participant + `", "role":"participant"}}}`
		e.org.InstantExecute(proposalAddParticipantJSON)
	} else {
		typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
		proposalAddMemberJSON := `{"title":"add member with participant role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + participant + `","roles":["participant"]}}}`
		e.org.InstantExecute(proposalAddMemberJSON)
	}
}

func (e *Event) RemoveParticipant(participant string) {
	if e.org.MemberModule.CountMemberRoles(participant) > 1 {
		typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
		proposalRemoveParticipantJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + participant + `", "role":"participant"}}}`
		e.org.InstantExecute(proposalRemoveParticipantJSON)
	} else {
		typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
		proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":"` + participant + `"}}`
		e.org.InstantExecute(proposalRemoveMemberJSON)
	}
}

func (e *Event) AddGatekeeper(gatekeeper string) {
	if e.org.MemberModule.CountMemberRoles(gatekeeper) > 0 {
		typeAddRole := dao_roles_based.NewAddRoleToUserMessageHandler(nil).Type()
		proposalAddGatekeeperJSON := `{"title":"add gatekeeper","description":"no description","message":{"type":"` + typeAddRole + `","payload":{"address":"` + gatekeeper + `", "role":"gatekeeper"}}}`
		e.org.InstantExecute(proposalAddGatekeeperJSON)
	} else {
		typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
		proposalAddMemberJSON := `{"title":"add member with gatekeeper role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + gatekeeper + `","roles":["gatekeeper"]}}}`
		e.org.InstantExecute(proposalAddMemberJSON)
	}
}

func (e *Event) RemoveGatekeeper(gatekeeper string) {
	if e.org.MemberModule.CountMemberRoles(gatekeeper) > 1 {
		typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
		proposalRemoveGatekeeperJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + gatekeeper + `", "role":"gatekeeper"}}}`
		e.org.InstantExecute(proposalRemoveGatekeeperJSON)
	} else {
		typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
		proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":"` + gatekeeper + `"}}`
		e.org.InstantExecute(proposalRemoveMemberJSON)
	}
}

func (e *Event) AssertCallerIsOrganizer() {
	caller := std.PrevRealm().Addr().String()
	if !e.org.MemberModule.HasRole(caller, "organizer") {
		panic("caller is not organizer of the event")
	}
}

func (e *Event) CountParticipants() int {
	return len(e.org.MemberModule.GetMembersWithRole("participant"))
}

func (e *Event) GetInfoJSON() string {
	obj := json.ObjectNode("", map[string]*json.Node{
		"title":       json.StringNode("", e.GetProfileString(std.CurrentRealm().Addr(), "DisplayName", "")),
		"description": json.StringNode("", e.GetProfileString(std.CurrentRealm().Addr(), "Bio", "")),
		"imageUri":    json.StringNode("", e.GetProfileString(std.CurrentRealm().Addr(), "Avatar", "")),
		"startDate":   json.StringNode("", ufmt.Sprintf("%d", e.StartDate)),
		"endDate":     json.StringNode("", ufmt.Sprintf("%d", e.EndDate)),
		"capacity":    json.NumberNode("", float64(e.Capacity)),
		"creatorAddr": json.StringNode("", e.Creator),
		"location":    json.StringNode("", e.Location),
	})
	bz, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
