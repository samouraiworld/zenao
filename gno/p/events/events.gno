package events

import (
	"std"

	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
	"gno.land/p/zenao/dao_roles_based"
)

type GetProfileString func(addr std.Address, field string, def string) string

type Event struct {
	id               string
	creator          string
	startDate        int64
	endDate          int64
	ticketPrice      float64
	capacity         int64
	getProfileString GetProfileString
	org              *dao_roles_based.DaoRolesBased // don't export to limit the access to all dao methods
}

func NewEvent(id string, creatorAddr string, title string, description string, startDate int64, endDate int64, ticketPrice float64, capacity int64, getProfileString GetProfileString, zenaoAdminAddr string) *Event {
	roles := []string{"organizer", "gatekeeper", "participant"}
	members := [][]string{
		{creatorAddr, "organizer"},
		{zenaoAdminAddr, "organizer"},
	}

	var resourcesJSON = `[{"resource":"init","condition":{"type":"role-count","role":"organizer","count":"1"}}]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON(title, description, roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	event := &Event{
		id:               id,
		creator:          creatorAddr,
		startDate:        startDate,
		endDate:          endDate,
		ticketPrice:      ticketPrice,
		capacity:         capacity,
		org:              dao,
		getProfileString: getProfileString,
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

func (e *Event) CountParticipants() int {
	return len(e.org.MemberModule.GetMembersWithRole("participant"))
}

func (e *Event) GetID() string {
	return e.id
}

func (e *Event) GetCreator() string {
	return e.creator
}

func (e *Event) GetEndDate() int64 {
	return e.endDate
}

func (e *Event) GetStartDate() int64 {
	return e.startDate
}

func (e *Event) GetTicketPrice() float64 {
	return e.ticketPrice
}

func (e *Event) GetCapacity() int64 {
	return e.capacity
}

func (e *Event) GetInfoJSON() string {
	obj := json.ObjectNode("", map[string]*json.Node{
		"title":       json.StringNode("", e.getProfileString(std.CurrentRealm().Addr(), "DisplayName", "")),
		"description": json.StringNode("", e.getProfileString(std.CurrentRealm().Addr(), "Bio", "")),
		"imageUri":    json.StringNode("", e.getProfileString(std.CurrentRealm().Addr(), "Avatar", "")),
		"startDate":   json.StringNode("", ufmt.Sprintf("%d", e.startDate)),
		"endDate":     json.StringNode("", ufmt.Sprintf("%d", e.endDate)),
		"ticketPrice": json.NumberNode("", float64(e.ticketPrice)),
		"capacity":    json.NumberNode("", float64(e.capacity)),
	})
	bz, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	return string(bz)
}
