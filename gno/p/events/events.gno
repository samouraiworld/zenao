package events

import (
	"gno.land/p/zenao/dao_roles_based"
)

type Event struct {
	id           string
	creator      string
	eventEndDate int64
	event        *dao_roles_based.DaoRolesBased // don't export to limit the access to all dao methods
}

func NewEvent(id string, creator string, eventEndDate int64) *Event {
	roles := []string{"organizer", "gatekeeper", "participant"}
	members := [][]string{
		{creator, "organizer"},
	}

	var resourcesJSON = `[{"resource":"init","condition":{"type":"role-count","role":"organizer","count":"1"}}]`

	// Don't pass the message handlers, since they are by default in the user dao
	dao := dao_roles_based.NewDaoRolesBasedJSON("event", "event", roles, members, resourcesJSON, []dao_roles_based.MessageHandler{})
	event := &Event{
		id:           id,
		creator:      creator,
		eventEndDate: eventEndDate,
		event:        dao,
	}

	return event
}

func (e *Event) AddParticipant(participant string) {
	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	proposalAddMemberJSON := `{"title":"add member with participant role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + participant + `","roles":["participant"]}}}`
	e.event.InstantExecute(proposalAddMemberJSON)
}

func (e *Event) RemoveParticipant(participant string) {
	typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
	proposalRemoveParticipantJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + participant + `", "role":"participant"}}}`
	e.event.InstantExecute(proposalRemoveParticipantJSON)
}

func (e *Event) AddGatekeeper(gatekeeper string) {
	typeAddMember := dao_roles_based.NewAddNewMemberMessageHandler(nil).Type()
	proposalAddMemberJSON := `{"title":"add member with gatekeeper role","description":"no description","message":{"type":"` + typeAddMember + `","payload":{"address":"` + gatekeeper + `","roles":["gatekeeper"]}}}`
	e.event.InstantExecute(proposalAddMemberJSON)
}

func (e *Event) RemoveGatekeeper(gatekeeper string) {
	typeRemoveRole := dao_roles_based.NewRemoveRoleFromUserMessageHandler(nil).Type()
	proposalRemoveGatekeeperJSON := `{"title":"remove participant","description":"no description","message":{"type":"` + typeRemoveRole + `","payload":{"address":"` + gatekeeper + `", "role":"gatekeeper"}}}`
	e.event.InstantExecute(proposalRemoveGatekeeperJSON)
}

func (e *Event) GetID() string {
	return e.id
}

func (e *Event) GetCreator() string {
	return e.creator
}

func (e *Event) GetEndDate() int64 {
	return e.eventEndDate
}
