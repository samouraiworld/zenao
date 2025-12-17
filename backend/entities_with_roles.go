package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

func (s *ZenaoServer) EntitiesWithRoles(ctx context.Context, req *connect.Request[zenaov1.EntitiesWithRolesRequest]) (*connect.Response[zenaov1.EntitiesWithRolesResponse], error) {
	if req.Msg.Org == nil || req.Msg.Org.EntityId == "" || req.Msg.Org.EntityType == "" {
		return nil, errors.New("org entity type and id are required")
	}

	if len(req.Msg.Roles) == 0 {
		return nil, errors.New("roles array is required with at least one element")
	}

	var (
		entities []*zeni.EntityRole
		res      []*zenaov1.EntityWithRoles
	)
	// TODO: Optimize to include the roles within the return of GetOrgUsersWithRoles ?
	if err := s.DB.TxWithSpan(ctx, "UsersWithRole", func(tx zeni.DB) error {
		var err error
		entities, err = tx.EntitiesWithRoles(req.Msg.Org.EntityType, req.Msg.Org.EntityId, req.Msg.Roles)
		if err != nil {
			return err
		}
		for _, e := range entities {
			roles, err := tx.EntityRoles(e.EntityType, e.EntityID, req.Msg.Org.EntityType, req.Msg.Org.EntityId)
			if err != nil {
				return err
			}
			realmID, err := s.Chain.EntityRealmID(e.EntityType, e.EntityID)
			if err != nil {
				return err
			}
			userWithRoles := &zenaov1.EntityWithRoles{
				RealmId: realmID,
				Roles:   roles,
			}
			res = append(res, userWithRoles)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.EntitiesWithRolesResponse{EntitiesWithRoles: res}), nil
}
