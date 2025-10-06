package users

import (
	"chain/runtime"
	"strings"

	"gno.land/p/moul/md"
	"gno.land/p/nt/ufmt"
	"gno.land/p/zenao/basedao"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
)

type User struct {
	DAO        daokit.DAO
	DAOPrivate *basedao.DAOPrivate
}

type Config struct {
	Name             string
	Bio              string
	AvatarURI        string
	ZenaoAdminAddr   string
	GetProfileString basedao.ProfileStringGetter
	SetProfileString basedao.ProfileStringSetter
	CrossFn          daokit.CrossFn
	SetImplemFn      daokit.SetImplemFn
}

func NewUser(conf *Config) *User {
	roles := []basedao.RoleInfo{
		{
			Name:        "zenao-admin",
			Description: "Admin responsible for managing the account until it becomes self-custodial",
		},
	}
	members := []basedao.Member{
		{
			Address: conf.ZenaoAdminAddr,
			Roles:   []string{"zenao-admin"},
		},
	}

	memberStore := basedao.NewMembersStore(roles, members)
	adminVetoCond := daocond.RoleCount(1, "zenao-admin", memberStore.HasRole)

	var user *User

	// Don't pass the message handlers, since they are by default in the user privdao
	pubdao, privdao := basedao.New(&basedao.Config{
		Name:             conf.Name,
		Description:      conf.Bio,
		ImageURI:         conf.AvatarURI,
		Members:          memberStore,
		SetProfileString: conf.SetProfileString,
		GetProfileString: conf.GetProfileString,
		InitialCondition: adminVetoCond,
		NoCreationEvent:  true, // don't list users in dao registries
		CrossFn:          conf.CrossFn,
		SetImplemFn:      conf.SetImplemFn,
		RenderFn: func(path string, dao *basedao.DAOPrivate) string {
			return user.Render(path)
		},
	})

	privdao.Core.Resources.Set(&daokit.Resource{
		Condition: adminVetoCond,
		Handler:   daokit.NewExecuteLambdaHandler(),
	})

	privdao.Core.Resources.Set(&daokit.Resource{
		Condition: adminVetoCond,
		Handler:   daokit.NewInstantExecuteHandler(),
	})

	user = &User{
		DAO:        pubdao,
		DAOPrivate: privdao,
	}

	return user
}

func (u *User) Render(path string) string {
	addr := runtime.CurrentRealm().Address()
	s := ""
	if path == "" {
		s += md.H1(u.DAOPrivate.GetProfileString(addr, "DisplayName", "Anon"))
		s += md.Paragraph(md.Image("Avatar", pfpURL(u.DAOPrivate.GetProfileString(addr, "Avatar", ""))))
		s += md.Paragraph(u.DAOPrivate.GetProfileString(addr, "Bio", "No bio"))
		s += md.HorizontalRule()
		path = "noprofile"
	}
	s += u.DAOPrivate.RenderRouter.Render(path)
	return s
}

func pfpURL(uri string) string {
	if !strings.HasPrefix(uri, "ipfs://") {
		return uri
	}
	withoutScheme := strings.TrimPrefix(uri, "ipfs://")
	res := ufmt.Sprintf(`https://%s/ipfs/%s?img-width=100&img-height=100&img-fit=cover&img-dpr=2`, gatewayDomain, withoutScheme)
	return res
}

const gatewayDomain = "pinata.zenao.io"
