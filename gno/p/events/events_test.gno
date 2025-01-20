package events

import (
	"github.com/gnolang/gno/gnovm/stdlibs/std"
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
}
