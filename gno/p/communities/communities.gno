package communities

import (
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

	return community
}

func (c *Community) Render(path string) string {
	info := c.Info()
	return "# Community: " + info.DisplayName + "\n"
}
