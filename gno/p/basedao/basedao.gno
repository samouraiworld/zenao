package basedao

import (
	"errors"
	"std"

	"gno.land/p/demo/mux"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
)

type daoPublic struct {
	impl *DAOPrivate
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

// DAO is meant for internal realm usage and should not be exposed
type DAOPrivate struct {
	Core             *daokit.Core
	Members          *MembersStore
	RenderRouter     *mux.Router
	GetProfileString ProfileStringGetter
	Realm            std.Realm
}

type Config struct {
	Name              string
	Description       string
	ImageURI          string
	Members           *MembersStore
	NoDefaultHandlers bool
	NoEvents          bool
	InitialCondition  daocond.Condition
	SetProfileString  ProfileStringSetter
	GetProfileString  ProfileStringGetter
	NoCreationEvent   bool
}

type ProfileStringSetter func(field string, value string) bool
type ProfileStringGetter func(addr std.Address, field string, def string) string

const EventBaseDAOCreated = "BaseDAOCreated"

func emitBaseDAOCreated() {
	std.Emit(EventBaseDAOCreated)
}

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
	core.NoEvents = conf.NoEvents

	dao := &DAOPrivate{
		Core:             core,
		Members:          members,
		GetProfileString: conf.GetProfileString,
		Realm:            std.CurrentRealm(),
	}
	dao.initRenderingRouter()

	if conf.SetProfileString != nil {
		conf.SetProfileString("DisplayName", conf.Name)
		conf.SetProfileString("Bio", conf.Description)
		conf.SetProfileString("Avatar", conf.ImageURI)
	}

	if !conf.NoDefaultHandlers {
		if conf.InitialCondition == nil {
			conf.InitialCondition = daocond.MembersThreshold(0.6, members.IsMember, members.MembersCount)
		}

		if conf.SetProfileString != nil {
			dao.Core.Resources.Set(&daokit.Resource{
				Handler:   NewEditProfileHandler(conf.SetProfileString, []string{"DisplayName", "Bio", "Avatar"}),
				Condition: conf.InitialCondition,
			})
		}

		// register management handlers
		for _, m := range []daokit.MessageHandler{
			NewAddMemberHandler(dao),
			NewRemoveMemberHandler(dao),
			NewAssignRoleHandler(dao),
			NewUnassignRoleHandler(dao),
		} {
			dao.Core.Resources.Set(&daokit.Resource{Handler: m, Condition: conf.InitialCondition})
		}
	}

	if !conf.NoCreationEvent {
		emitBaseDAOCreated()
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
	id := std.PreviousRealm().Address().String()
	if !d.Members.IsMember(id) {
		panic(errors.New("caller is not a member"))
	}
	return id
}
