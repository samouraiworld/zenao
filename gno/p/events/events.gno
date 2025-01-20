package events

import (
	"std"

	"gno.land/p/zenao/dao_roles_based"
)

type Event struct {
	event *dao_roles_based.DaoRolesBased // don't export to limit the access to all dao methods
}

func NewEvent() *Event {
	caller := std.PrevRealm().Addr().String()
	roles := []string{"organizer", "gatekeeper", "participant"}
	members := [][]string{
		{caller, "organizer"},
	}

	var resourcesJSON = `[{"resource":"init","condition":{"type":"role-count","role":"organizer","count":"1"}}]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON("event", "event", roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	event := &Event{
		event: dao,
	}

	return event
}

func (e *Event) AddParticipant(participant string) {
	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	proposalAddMemberJSON := `{"title":"add member with participant role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + participant + `","roles":["participant"]}}}`
	e.event.InstantExecute(proposalAddMemberJSON)
}

func (e *Event) RemoveParticipant(participant string) {
	typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
	proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":{"address":"` + participant + `"}}}`
	e.event.InstantExecute(proposalRemoveMemberJSON)
}

func (e *Event) AddGatekeeper(gatekeeper string) {
	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	proposalAddMemberJSON := `{"title":"add member with gatekeeper role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + gatekeeper + `","roles":["gatekeeper"]}}}`
	e.event.InstantExecute(proposalAddMemberJSON)
}

func (e *Event) RemoveGatekeeper(gatekeeper string) {
	typeRemoveMember := dao_roles_based.NewRemoveMemberMessageHandler(nil).Type()
	proposalRemoveMemberJSON := `{"title":"remove member","description":"no description","message":{"type":"` + typeRemoveMember + `","payload":{"address":"` + gatekeeper + `"}}}`
	e.event.InstantExecute(proposalRemoveMemberJSON)
}
