package basedao

import (
	"chain"
	"chain/runtime"
	"errors"

	"gno.land/p/nt/mux"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
)

type daoPublic struct {
	impl *DAOPrivate
}

// Extension implements daokit.DAO.
func (d *daoPublic) Extension(path string) daokit.Extension {
	ext, ok := d.impl.Core.Extensions.Get(path)
	if !ok {
		return nil
	}
	if ext.Info().Private && runtime.CurrentRealm().PkgPath() != d.impl.Realm.PkgPath() {
		panic("attempt to get private extension outside of DAO realm")
	}
	return ext
}

// ExtensionsList implements daokit.DAO.
func (d *daoPublic) ExtensionsList() daokit.ExtensionsList {
	return d.impl.Core.Extensions.List()
}

func (d *daoPublic) Propose(req daokit.ProposalRequest) uint64 {
	return d.impl.Propose(req)
}

func (d *daoPublic) Execute(id uint64) {
	d.impl.Execute(id)
}

func (d *daoPublic) Vote(id uint64, vote daocond.Vote) {
	d.impl.Vote(id, vote)
}

func (d *daoPublic) Render(path string) string {
	return d.impl.Render(path)
}

// DAO is meant for internal realm usage and should not be exposed
type DAOPrivate struct {
	Core             *daokit.Core
	Members          *MembersStore
	RenderRouter     *mux.Router
	GetProfileString ProfileStringGetter
	Realm            runtime.Realm
	RenderFn         func(path string, dao *DAOPrivate) string

	InitialConfig *Config // mostly there in case we need this data during upgrade
}

type RenderFn func(path string, dao *DAOPrivate) string

type Config struct {
	Name               string
	Description        string
	ImageURI           string
	Members            *MembersStore
	NoDefaultHandlers  bool
	NoDefaultRendering bool
	InitialCondition   daocond.Condition
	SetProfileString   ProfileStringSetter
	GetProfileString   ProfileStringGetter
	NoCreationEvent    bool
	SetImplemFn        daokit.SetImplemFn
	RenderFn           RenderFn
	CrossFn            daokit.CrossFn
	PrivateVarName     string
}

type ProfileStringSetter func(cur realm, field string, value string) bool
type ProfileStringGetter func(addr address, field string, def string) string

const EventBaseDAOCreated = "BaseDAOCreated"

func New(conf *Config) (daokit.DAO, *DAOPrivate) {
	// XXX: emit events from memberstore

	members := conf.Members
	if members == nil {
		members = NewMembersStore(nil, nil)
	}

	if conf.GetProfileString == nil {
		panic(errors.New("GetProfileString is required"))
	}

	core := daokit.NewCore()
	dao := &DAOPrivate{
		Core:             core,
		Members:          members,
		GetProfileString: conf.GetProfileString,
		Realm:            runtime.CurrentRealm(),
		RenderFn:         conf.RenderFn,
		InitialConfig:    conf,
	}

	dao.Core.Extensions.Set(&membersViewExtension{
		getStore:  func() *MembersStore { return dao.Members },
		queryPath: dao.Realm.PkgPath() + "." + conf.PrivateVarName + ".Members", // XXX: take varname as input
	})

	dao.initRenderingRouter()

	if !conf.NoDefaultRendering {
		dao.InitDefaultRendering()
	}

	if conf.SetProfileString != nil {
		conf.SetProfileString(cross, "DisplayName", conf.Name)
		conf.SetProfileString(cross, "Bio", conf.Description)
		conf.SetProfileString(cross, "Avatar", conf.ImageURI)
	}

	if !conf.NoDefaultHandlers {
		if conf.InitialCondition == nil {
			conf.InitialCondition = daocond.MembersThreshold(0.6, members.IsMember, members.MembersCount)
		}

		if conf.SetProfileString != nil {
			dao.Core.Resources.Set(&daokit.Resource{
				Handler:     NewEditProfileHandler(conf.SetProfileString, []string{"DisplayName", "Bio", "Avatar"}),
				Condition:   conf.InitialCondition,
				DisplayName: "Edit Profile",
				Description: "This proposal allows you to edit this DAO profile.",
			})
		}

		if conf.SetImplemFn != nil {
			dao.Core.Resources.Set(&daokit.Resource{
				Handler:     NewChangeDAOImplementationHandler(dao, conf.SetImplemFn),
				Condition:   conf.InitialCondition,
				DisplayName: "Change DAO Implementation",
				Description: "Change the underlying DAO implementation.",
			})
		}

		defaultResources := []daokit.Resource{
			{
				Handler:     NewAddMemberHandler(dao),
				Condition:   conf.InitialCondition,
				DisplayName: "Add Member",
				Description: "This proposal allows you to add a new member to the DAO.",
			},
			{
				Handler:     NewRemoveMemberHandler(dao),
				Condition:   conf.InitialCondition,
				DisplayName: "Remove Member",
				Description: "This proposal allows you to remove a member from the DAO.",
			},
			{
				Handler:     NewAssignRoleHandler(dao),
				Condition:   conf.InitialCondition,
				DisplayName: "Assign Role",
				Description: "This proposal allows you to assign a role to a member.",
			},
			{
				Handler:     NewUnassignRoleHandler(dao),
				Condition:   conf.InitialCondition,
				DisplayName: "Unassign Role",
				Description: "This proposal allows you to unassign a role from a member.",
			},
		}
		// register management handlers
		for _, resource := range defaultResources {
			dao.Core.Resources.Set(&resource)
		}

	}

	if !conf.NoCreationEvent {
		chain.Emit(EventBaseDAOCreated)
	}

	return &daoPublic{impl: dao}, dao
}

func (d *DAOPrivate) Vote(proposalID uint64, vote daocond.Vote) {
	if len(vote) > 16 {
		panic("invalid vote")
	}

	voterID := d.assertCallerIsMember()
	d.Core.Vote(voterID, proposalID, vote)
}

func (d *DAOPrivate) Execute(proposalID uint64) {
	_ = d.assertCallerIsMember()
	d.Core.Execute(proposalID)
}

func (d *DAOPrivate) Propose(req daokit.ProposalRequest) uint64 {
	proposerID := d.assertCallerIsMember()
	return d.Core.Propose(proposerID, req)
}

func (d *DAOPrivate) assertCallerIsMember() string {
	id := runtime.PreviousRealm().Address().String()
	if !d.Members.IsMember(id) {
		panic(errors.New("caller is not a member"))
	}
	return id
}
