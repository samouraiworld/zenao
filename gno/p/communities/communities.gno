package communities

import (
	"std"

	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/role_manager"
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
	roles := []role_manager.RoleInfo{
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
	conf.SetProfileString("Banner", conf.BannerURI)

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
	}

	for _, res := range resources {
		community.DAOPrivate.Core.Resources.Set(res)
	}

	return community
}

const MsgAddMemberKind = "gno.land/p/zenao/communities.AddMember"

type MsgAddMember struct {
	address string
}

func (msg *MsgAddMember) String() string {
	return "Add " + msg.address + " to community as a member"
}

func (c *Community) addMemberHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgAddMemberKind, func(i interface{}) {
		msg, ok := i.(*MsgAddMember)
		if !ok {
			panic("invalid payload type")
		}

		callerIsAdmin := c.DAOPrivate.Members.HasRole(std.PreviousRealm().Address().String(), "administrator")
		if !callerIsAdmin {
			panic("only administrators can add members")
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

func NewAddMemberMsg(address string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgAddMemberKind, &MsgAddMember{
		address: address,
	})
}

const MsgRemoveMemberKind = "gno.land/p/zenao/communities.RemoveMember"

type MsgRemoveMember struct {
	address string
}

func (msg *MsgRemoveMember) String() string {
	return "Remove " + msg.address + " from community"
}

func (c *Community) removeMemberHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgRemoveMemberKind, func(i interface{}) {
		msg, ok := i.(*MsgRemoveMember)
		if !ok {
			panic("invalid payload type")
		}

		callerIsAdmin := c.DAOPrivate.Members.HasRole(std.PreviousRealm().Address().String(), "administrator")
		if !callerIsAdmin {
			panic("only administrators can remove members")
		}

		if !c.DAOPrivate.Members.HasRole(msg.address, "member") {
			panic("address is not a member of the community")
		}

		if c.DAOPrivate.Members.CountMemberRoles(msg.address) > 1 {
			c.DAOPrivate.Members.RemoveRoleFromMember(msg.address, "member")
		} else {
			c.DAOPrivate.Members.RemoveMember(msg.address)
		}
	})
}

func NewRemoveMemberMsg(address string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgRemoveMemberKind, &MsgRemoveMember{
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

func (c *Community) addEventHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgAddEventKind, func(i interface{}) {
		msg, ok := i.(*MsgAddEvent)
		if !ok {
			panic("invalid payload type")
		}

		callerIsAdmin := c.DAOPrivate.Members.HasRole(std.PreviousRealm().Address().String(), "administrator")
		if !callerIsAdmin {
			panic("only administrators can add events")
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

func NewAddEventMsg(address string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgAddEventKind, &MsgAddEvent{
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

func (c *Community) removeEventHandler() daokit.MessageHandler {
	return daokit.NewMessageHandler(MsgRemoveEventKind, func(i interface{}) {
		msg, ok := i.(*MsgRemoveEvent)
		if !ok {
			panic("invalid payload type")
		}

		callerIsAdmin := c.DAOPrivate.Members.HasRole(std.PreviousRealm().Address().String(), "administrator")
		if !callerIsAdmin {
			panic("only administrators can remove events")
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

func NewRemoveEventMsg(address string) daokit.ExecutableMessage {
	return daokit.NewMessage(MsgRemoveEventKind, &MsgRemoveEvent{
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
