package basedao

import (
	"errors"
	"std"
	"strings"

	"gno.land/p/moul/md"
	"gno.land/p/nt/ufmt"
	"gno.land/p/zenao/daokit"
)

// ADD MEMBER

const ActionAddMemberKind = "gno.land/p/zenao/basedao.AddMember"

type ActionAddMember struct {
	Address std.Address
	Roles   []string
}

func (a *ActionAddMember) String() string {
	s := "Add member " + a.Address.String()
	if len(a.Roles) != 0 {
		s += " with roles " + strings.Join(a.Roles, ", ")
	}
	return s
}

func NewAddMemberHandler(dao *DAOPrivate) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddMemberKind, func(ipayload interface{}) {
		payload, ok := ipayload.(*ActionAddMember)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		member := payload.Address.String()
		if !dao.Members.Members.Has(member) {
			dao.Members.AddMember(member, payload.Roles)
			return
		}
		for _, role := range payload.Roles {
			if dao.Members.HasRole(member, role) {
				continue
			}
			dao.Members.AddRoleToMember(member, role)
		}
	})
}

func NewAddMemberAction(payload *ActionAddMember) daokit.Action {
	return daokit.NewAction(ActionAddMemberKind, payload)
}

// REMOVE MEMBER

const ActionRemoveMemberKind = "gno.land/p/zenao/basedao.RemoveMember"

func NewRemoveMemberHandler(dao *DAOPrivate) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionRemoveMemberKind, func(ipayload interface{}) {
		addr, ok := ipayload.(std.Address)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		dao.Members.RemoveMember(addr.String())
	})
}

func NewRemoveMemberAction(addr std.Address) daokit.Action {
	return daokit.NewAction(ActionRemoveMemberKind, addr)
}

// ASSIGN ROLE

const ActionAssignRoleKind = "gno.land/p/zenao/basedao.AssignRole"

type ActionAssignRole struct {
	Address std.Address
	Role    string
}

func (a *ActionAssignRole) String() string {
	return ufmt.Sprintf("Assign role %q to user %s", a.Role, a.Address)
}

func NewAssignRoleHandler(dao *DAOPrivate) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAssignRoleKind, func(i interface{}) {
		payload, ok := i.(*ActionAssignRole)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		dao.Members.AddRoleToMember(payload.Address.String(), payload.Role)
	})
}

func NewAssignRoleAction(payload *ActionAssignRole) daokit.Action {
	return daokit.NewAction(ActionAssignRoleKind, payload)
}

// UNASSIGN ROLE

const ActionUnassignRoleKind = "gno.land/p/zenao/basedao.UnassignRole"

type ActionUnassignRole struct {
	Address std.Address
	Role    string
}

func (a *ActionUnassignRole) String() string {
	return ufmt.Sprintf("Remove role %q from user %s", a.Role, a.Address)
}

func NewUnassignRoleHandler(dao *DAOPrivate) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionUnassignRoleKind, func(i interface{}) {
		payload, ok := i.(*ActionUnassignRole)
		if !ok {
			panic(errors.New("invalid payload type"))
		}
		dao.Members.RemoveRoleFromMember(payload.Address.String(), payload.Role)
	})
}

func NewUnassignRoleAction(payload *ActionUnassignRole) daokit.Action {
	return daokit.NewAction(ActionUnassignRoleKind, payload)
}

// EDIT PROFILE

const ActionEditProfileKind = "gno.land/p/zenao/basedao.EditProfile"

type ActionEditProfile struct {
	kv [][2]string
}

func (a *ActionEditProfile) String() string {
	elems := []string{}
	for _, v := range a.kv {
		elems = append(elems, v[0]+": "+v[1])
	}
	return md.BulletList(elems)
}

func NewEditProfileAction(kv ...[2]string) daokit.Action {
	return daokit.NewAction(ActionEditProfileKind, &ActionEditProfile{kv: kv})
}

func NewEditProfileHandler(setter ProfileStringSetter, allowedFields []string) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionEditProfileKind, func(i interface{}) {
		action, ok := i.(*ActionEditProfile)
		if !ok {
			panic(errors.New("invalid action type"))
		}
		for _, elem := range action.kv {
			k, v := elem[0], elem[1]
			if len(allowedFields) > 0 && !stringSliceContains(allowedFields, k) {
				panic(ufmt.Errorf("unauthorized field %q", k))
			}
			setter(cross, k, v)
		}
	})
}

func stringSliceContains(s []string, target string) bool {
	for _, elem := range s {
		if elem == target {
			return true
		}
	}
	return false
}
