package basedao

import (
	"errors"

	"gno.land/p/zenao/daokit"
)

// making this action name extra explicit
const ActionChangeDAOImplementationKind = "gno.land/p/zenao/basedao.ChangeDAOImplementation"

type MigrateFn = func(prev *DAOPrivate) daokit.DAO

type actionChangeDAOImplementation struct {
	migrate MigrateFn
}

func (a *actionChangeDAOImplementation) String() string {
	return "WARNING: thoroughly check the migration code before approving this"
}

func NewChangeDAOImplementationHandler(dao *DAOPrivate, setImplem daokit.SetImplemFn) daokit.ActionHandler {
	return daokit.NewActionHandler(ActionChangeDAOImplementationKind, func(i interface{}) {
		action, ok := i.(*actionChangeDAOImplementation)
		if !ok {
			panic(errors.New("invalid action type"))
		}

		migrated := action.migrate(dao)
		setImplem(migrated)
	})
}

func NewChangeDAOImplementationAction(migrate MigrateFn) daokit.Action {
	return daokit.NewAction(ActionChangeDAOImplementationKind, &actionChangeDAOImplementation{migrate: migrate})
}
