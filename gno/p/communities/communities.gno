package communities

import (
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
)

type Community struct {
	getProfileString basedao.ProfileStringGetter
	setProfileString basedao.ProfileStringSetter
	DAOPrivate       *basedao.DAOPrivate
	DAO              daokit.DAO
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
	for _, admin := range conf.Administrators {
		members = append(members, basedao.Member{
			Address: admin,
			Roles:   []string{"administrator"},
		})
	}
	for _, member := range conf.Members {
		members = append(members, basedao.Member{
			Address: member,
			Roles:   []string{"member"},
		})
	}
	for _, event := range conf.Events {
		members = append(members, basedao.Member{
			Address: event,
			Roles:   []string{"event"},
		})
	}
	members = append(members, basedao.Member{
		Address: conf.ZenaoAdminAddr,
		Roles:   []string{"zenao-admin"},
	})

	memberStore := basedao.NewMembersStore(roles, members)
	adminCond := daocond.RoleCount(1, "zenao-admin", memberStore.HasRole)

	pubdao, privdao := basedao.New(&basedao.Config{
		Name:             conf.DisplayName,
		Description:      conf.Description,
		ImageURI:         conf.AvatarURI,
		Members:          memberStore,
		SetProfileString: basedao.ProfileStringSetter(conf.SetProfileString),
		GetProfileString: basedao.ProfileStringGetter(conf.GetProfileString),
		InitialCondition: adminCond,
	})
	conf.SetProfileString(cross, "Banner", conf.BannerURI)

	community := &Community{
		getProfileString: basedao.ProfileStringGetter(conf.GetProfileString),
		setProfileString: basedao.ProfileStringSetter(conf.SetProfileString),
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

const MsgEditCommunityKind = "gno.land/p/zenao/communities.EditCommunity"

type MsgEditCommunity struct {
	displayName    string
	description    string
	avatarURI      string
	bannerURI      string
	administrators []string
}

func (msg *MsgEditCommunity) String() string {
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
	return daokit.NewActionHandler(MsgEditCommunityKind, func(i interface{}) {
		msg, ok := i.(*MsgEditCommunity)
		if !ok {
			panic("invalid payload type")
		}

		if msg.displayName != "" {
			c.setProfileString(cross, "DisplayName", msg.displayName)
		}
		if msg.description != "" {
			c.setProfileString(cross, "Bio", msg.description)
		}
		if msg.avatarURI != "" {
			c.setProfileString(cross, "Avatar", msg.avatarURI)
		}
		if msg.bannerURI != "" {
			c.setProfileString(cross, "Banner", msg.bannerURI)
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

func NewEditCommunityMsg(displayName, description, avatarURI, bannerURI string, administrators []string) daokit.Action {
	return daokit.NewAction(MsgEditCommunityKind, &MsgEditCommunity{
		displayName:    displayName,
		description:    description,
		avatarURI:      avatarURI,
		bannerURI:      bannerURI,
		administrators: administrators,
	})
}

const MsgAddMemberKind = "gno.land/p/zenao/communities.AddMember"

type MsgAddMember struct {
	address string
}

func (msg *MsgAddMember) String() string {
	return "Add " + msg.address + " to community as a member"
}

func (c *Community) addMemberHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(MsgAddMemberKind, func(i interface{}) {
		msg, ok := i.(*MsgAddMember)
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

func NewAddMemberMsg(address string) daokit.Action {
	return daokit.NewAction(MsgAddMemberKind, &MsgAddMember{
		address: address,
	})
}

const MsgAddMembersKind = "gno.land/p/zenao/communities.AddMembers"

type MsgAddMembers struct {
	addresses []string
}

func (msg *MsgAddMembers) String() string {
	s := "Add members to community:\n"
	for _, addr := range msg.addresses {
		s += "- " + addr + "\n"
	}
	return s
}

// NOTE: skip members that are already part of the community
func (c *Community) addMembersHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgAddMembersKind, func(i interface{}) {
		msg, ok := i.(*MsgAddMembers)
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

func NewAddMembersMsg(addresses []string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgAddMembersKind, &MsgAddMembers{
		addresses: addresses,
	})
}

const MsgRemoveMemberKind = "gno.land/p/zenao/communities.RemoveMember"

type MsgRemoveMember struct {
	address string
}

func (msg *MsgRemoveMember) String() string {
	return "Remove " + msg.address + " from community"
}

func (c *Community) removeMemberHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(MsgRemoveMemberKind, func(i interface{}) {
		msg, ok := i.(*MsgRemoveMember)
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

func NewRemoveMemberMsg(address string) daokit.Action {
	return daokit.NewAction(MsgRemoveMemberKind, &MsgRemoveMember{
		address: address,
	})
}

const MsgAddEventKind = "gno.land/p/zenao/communities.AddEvent"

type MsgAddEvent struct {
	address string
}

func (msg *MsgAddEvent) String() string {
	return "Add " + msg.address + " to community as an event"
}

func (c *Community) addEventHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(MsgAddEventKind, func(i interface{}) {
		msg, ok := i.(*MsgAddEvent)
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

func NewAddEventMsg(address string) daokit.Action {
	return daokit.NewAction(MsgAddEventKind, &MsgAddEvent{
		address: address,
	})
}

const MsgRemoveEventKind = "gno.land/p/zenao/communities.RemoveEvent"

type MsgRemoveEvent struct {
	address string
}

func (msg *MsgRemoveEvent) String() string {
	return "Remove " + msg.address + " from community as an event"
}

func (c *Community) removeEventHandler() daokit.ActionHandler {
	return daokit.NewActionHandler(MsgRemoveEventKind, func(i interface{}) {
		msg, ok := i.(*MsgRemoveEvent)
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

func NewRemoveEventMsg(address string) daokit.Action {
	return daokit.NewAction(MsgRemoveEventKind, &MsgRemoveEvent{
		address: address,
	})
}

// TODO: Improve render avoid double rendering on member with multiple roles
func (c *Community) Render(path string) string {
	info := c.Info()
	s := "# Community: " + info.DisplayName + "\n"
	s += "## Description\n" + info.Description + "\n"
	s += "---"
	s += "\n## Members\n"
	for _, member := range info.Administrators {
		s += "- " + member + " (Administrator)\n"
	}
	for _, member := range c.DAOPrivate.Members.GetMembersWithRole("member") {
		s += "- " + member + " (Member)\n"
	}
	for _, event := range c.DAOPrivate.Members.GetMembersWithRole("event") {
		s += "- " + event + " (Event)\n"
	}
	s += "- " + c.DAOPrivate.Members.GetMembersWithRole("zenao-admin")[0] + " (Zenao Admin)\n"
	s += "---"
	return s

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
