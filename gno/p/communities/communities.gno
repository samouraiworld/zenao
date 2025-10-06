package communities

import (
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
)

type Community struct {
	GetProfileString basedao.ProfileStringGetter
	SetProfileString basedao.ProfileStringSetter
	DAOPrivate       *basedao.DAOPrivate
	DAO              daokit.DAO

	Config *Config // to get initial data during upgrade
}

type Config struct {
	Administrators   []string
	Members          []string
	Events           []string
	DisplayName      string
	Description      string
	AvatarURI        string
	BannerURI        string
	GetProfileString basedao.ProfileStringGetter
	SetProfileString basedao.ProfileStringSetter
	ZenaoAdminAddr   string
	CrossFn          daokit.CrossFn
	SetImplemFn      daokit.SetImplemFn
	FeedId           string
	PrivateVarName   string
}

func NewCommunity(conf *Config) *Community {
	if conf.ZenaoAdminAddr == "" {
		panic("missing ZenaoAdminAddr in config")
	}

	roles := []basedao.RoleInfo{
		{
			Name:        "zenao-admin",
			Description: "Admin responsible for managing the DAO until it becomes self-custodial",
		},
		{
			Name:        "administrator",
			Description: "Person who can manage the community",
		},
		{
			Name:        "member",
			Description: "Person who is a member of the community",
		},
		{
			Name:        "event",
			Description: "Event organized & managed by the community",
		},
	}

	var members []basedao.Member
	setRole := func(addr string, role string) {
		for idx, member := range members {
			if member.Address != addr {
				continue
			}
			for _, existing := range member.Roles {
				if existing == role {
					return
				}
			}
			members[idx].Roles = append(member.Roles, role)
			return
		}
		members = append(members, basedao.Member{
			Address: addr,
			Roles:   []string{role},
		})
	}
	for _, admin := range conf.Administrators {
		setRole(admin, "administrator")
	}
	for _, member := range conf.Members {
		setRole(member, "member")
	}
	for _, event := range conf.Events {
		setRole(event, "event")
	}
	setRole(conf.ZenaoAdminAddr, "zenao-admin")

	memberStore := basedao.NewMembersStore(roles, members)
	adminCond := daocond.RoleCount(1, "zenao-admin", memberStore.HasRole)

	var community *Community

	pubdao, privdao := basedao.New(&basedao.Config{
		Name:              conf.DisplayName,
		Description:       conf.Description,
		ImageURI:          conf.AvatarURI,
		Members:           memberStore,
		SetProfileString:  basedao.ProfileStringSetter(conf.SetProfileString),
		GetProfileString:  basedao.ProfileStringGetter(conf.GetProfileString),
		InitialCondition:  adminCond,
		CrossFn:           conf.CrossFn,
		SetImplemFn:       conf.SetImplemFn,
		MigrationParamsFn: func() []any { return []any{community} },
		PrivateVarName:    conf.PrivateVarName + ".DAOPrivate",
	})
	conf.SetProfileString(cross, "Banner", conf.BannerURI)

	community = &Community{
		GetProfileString: basedao.ProfileStringGetter(conf.GetProfileString),
		SetProfileString: basedao.ProfileStringSetter(conf.SetProfileString),
		DAOPrivate:       privdao,
		DAO:              pubdao,
	}

	oneAdmin := daocond.RoleCount(1, "administrator", memberStore.HasRole)

	resources := []*daokit.Resource{
		{
			Condition: oneAdmin,
			Handler:   community.addMemberHandler(),
		},
		{
			Condition: oneAdmin,
			Handler:   community.addMembersHandler(),
		},
		{
			Condition: oneAdmin,
			Handler:   community.removeMemberHandler(),
		},
		{
			Condition: oneAdmin,
			Handler:   community.addEventHandler(),
		},
		{
			Condition: oneAdmin,
			Handler:   community.removeEventHandler(),
		},
		{
			Condition: oneAdmin,
			Handler:   community.editCommunityHandler(),
		},
	}

	for _, res := range resources {
		community.DAOPrivate.Core.Resources.Set(res)
	}

	return community
}

const ActionEditCommunityKind = "gno.land/p/zenao/communities.EditCommunity"

type ActionEditCommunity struct {
	displayName    string
	description    string
	avatarURI      string
	bannerURI      string
	administrators []string
}

func (msg *ActionEditCommunity) String() string {
	s := "Edit community:\n"
	if msg.displayName != "" {
		s += "- Display Name: " + msg.displayName + "\n"
	}
	if msg.description != "" {
		s += "- Description: " + msg.description + "\n"
	}
	if msg.avatarURI != "" {
		s += "- Avatar URI: " + msg.avatarURI + "\n"
	}
	if msg.bannerURI != "" {
		s += "- Banner URI: " + msg.bannerURI + "\n"
	}
	for _, admin := range msg.administrators {
		s += "- Administrator: " + admin + "\n"
	}
	return s
}

func (c *Community) editCommunityHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionEditCommunityKind, func(i interface{}) {
		msg, ok := i.(*ActionEditCommunity)
		if !ok {
			panic("invalid payload type")
		}

		if msg.displayName != "" {
			c.SetProfileString(cross, "DisplayName", msg.displayName)
		}
		if msg.description != "" {
			c.SetProfileString(cross, "Bio", msg.description)
		}
		if msg.avatarURI != "" {
			c.SetProfileString(cross, "Avatar", msg.avatarURI)
		}
		if msg.bannerURI != "" {
			c.SetProfileString(cross, "Banner", msg.bannerURI)
		}
		if len(msg.administrators) > 0 {
			c.updateCommunityUserRoles("administrator", msg.administrators)
		}

		// XXX: ensure all admins are also members of the community
		for _, admin := range msg.administrators {
			if !c.DAOPrivate.Members.HasRole(admin, "member") {
				c.DAOPrivate.Members.AddRoleToMember(admin, "member")
			}
		}
	})
}

func NewEditCommunityAction(displayName, description, avatarURI, bannerURI string, administrators []string) daokit.Action {
	return daokit.NewAction(ActionEditCommunityKind, &ActionEditCommunity{
		displayName:    displayName,
		description:    description,
		avatarURI:      avatarURI,
		bannerURI:      bannerURI,
		administrators: administrators,
	})
}

const ActionAddMemberKind = "gno.land/p/zenao/communities.AddMember"

type ActionAddMember struct {
	address string
}

func (msg *ActionAddMember) String() string {
	return "Add " + msg.address + " to community as a member"
}

func (c *Community) addMemberHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddMemberKind, func(i interface{}) {
		msg, ok := i.(*ActionAddMember)
		if !ok {
			panic("invalid payload type")
		}

		if c.DAOPrivate.Members.HasRole(msg.address, "member") {
			panic("address is already a member of the community")
		}

		if c.DAOPrivate.Members.CountMemberRoles(msg.address) > 0 {
			c.DAOPrivate.Members.AddRoleToMember(msg.address, "member")
		} else {
			c.DAOPrivate.Members.AddMember(msg.address, []string{"member"})
		}
	})
}

func NewAddMemberAction(address string) daokit.Action {
	return daokit.NewAction(ActionAddMemberKind, &ActionAddMember{
		address: address,
	})
}

const ActionAddMembersKind = "gno.land/p/zenao/communities.AddMembers"

type ActionAddMembers struct {
	addresses []string
}

func (msg *ActionAddMembers) String() string {
	s := "Add members to community:\n"
	for _, addr := range msg.addresses {
		s += "- " + addr + "\n"
	}
	return s
}

// NOTE: skip members that are already part of the community
func (c *Community) addMembersHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddMembersKind, func(i interface{}) {
		msg, ok := i.(*ActionAddMembers)
		if !ok {
			panic("invalid payload type")
		}

		for _, addr := range msg.addresses {
			if c.DAOPrivate.Members.HasRole(addr, "member") {
				continue
			}

			if c.DAOPrivate.Members.CountMemberRoles(addr) > 0 {
				c.DAOPrivate.Members.AddRoleToMember(addr, "member")
			} else {
				c.DAOPrivate.Members.AddMember(addr, []string{"member"})
			}
		}
	})
}

func NewAddMembersAction(addresses []string) daokit.Action {
	return daokit.NewAction(ActionAddMembersKind, &ActionAddMembers{
		addresses: addresses,
	})
}

const ActionRemoveMemberKind = "gno.land/p/zenao/communities.RemoveMember"

type ActionRemoveMember struct {
	address string
}

func (msg *ActionRemoveMember) String() string {
	return "Remove " + msg.address + " from community"
}

func (c *Community) removeMemberHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionRemoveMemberKind, func(i interface{}) {
		msg, ok := i.(*ActionRemoveMember)
		if !ok {
			panic("invalid payload type")
		}
		administrators := c.DAOPrivate.Members.GetMembersWithRole("administrator")
		if len(administrators) == 1 && administrators[0] == msg.address {
			panic("cannot remove the only administrator of the community")
		}
		c.DAOPrivate.Members.RemoveMember(msg.address)
	})
}

func NewRemoveMemberAction(address string) daokit.Action {
	return daokit.NewAction(ActionRemoveMemberKind, &ActionRemoveMember{
		address: address,
	})
}

const ActionAddEventKind = "gno.land/p/zenao/communities.AddEvent"

type ActionAddEvent struct {
	address string
}

func (msg *ActionAddEvent) String() string {
	return "Add " + msg.address + " to community as an event"
}

func (c *Community) addEventHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionAddEventKind, func(i interface{}) {
		msg, ok := i.(*ActionAddEvent)
		if !ok {
			panic("invalid payload type")
		}

		if c.DAOPrivate.Members.HasRole(msg.address, "event") {
			panic("address is already an event in the community")
		}

		if c.DAOPrivate.Members.CountMemberRoles(msg.address) > 0 {
			c.DAOPrivate.Members.AddRoleToMember(msg.address, "event")
		} else {
			c.DAOPrivate.Members.AddMember(msg.address, []string{"event"})
		}
	})
}

func NewAddEventAction(address string) daokit.Action {
	return daokit.NewAction(ActionAddEventKind, &ActionAddEvent{
		address: address,
	})
}

const ActionRemoveEventKind = "gno.land/p/zenao/communities.RemoveEvent"

type ActionRemoveEvent struct {
	address string
}

func (msg *ActionRemoveEvent) String() string {
	return "Remove " + msg.address + " from community as an event"
}

func (c *Community) removeEventHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(ActionRemoveEventKind, func(i interface{}) {
		msg, ok := i.(*ActionRemoveEvent)
		if !ok {
			panic("invalid payload type")
		}

		if !c.DAOPrivate.Members.HasRole(msg.address, "event") {
			panic("address is not an event in the community")
		}

		if c.DAOPrivate.Members.CountMemberRoles(msg.address) > 1 {
			c.DAOPrivate.Members.RemoveRoleFromMember(msg.address, "event")
		} else {
			c.DAOPrivate.Members.RemoveMember(msg.address)
		}
	})
}

func NewRemoveEventAction(address string) daokit.Action {
	return daokit.NewAction(ActionRemoveEventKind, &ActionRemoveEvent{
		address: address,
	})
}

func (c *Community) updateCommunityUserRoles(role string, usersAddr []string) {
	currentUsers := c.DAOPrivate.Members.GetMembersWithRole(role)
	for _, user := range currentUsers {
		if !sliceContains(usersAddr, user) {
			// XXX: administrators are also members of the community so keep the member role
			c.DAOPrivate.Members.RemoveRoleFromMember(user, role)
		}
	}
	for _, user := range usersAddr {
		if !sliceContains(currentUsers, user) {
			if c.DAOPrivate.Members.IsMember(user) {
				c.DAOPrivate.Members.AddRoleToMember(user, role)
			} else {
				c.DAOPrivate.Members.AddMember(user, []string{role})
			}
		}
	}
}

func sliceContains(slice []string, elem string) bool {
	for _, e := range slice {
		if e == elem {
			return true
		}
	}
	return false
}
