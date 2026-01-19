package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetUserInfo(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserInfoRequest],
) (*connect.Response[zenaov1.GetUserInfoResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-user-info", zap.String("user-id", actor.User.ID), zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	actorPlan := actor.User.Plan
	if actor.IsTeam() {
		actorPlan = actor.ActingAs.Plan
	}

	return connect.NewResponse(&zenaov1.GetUserInfoResponse{
		UserId:    actor.UserID(),
		Plan:      actor.User.Plan.String(),
		ActorId:   actor.ID(),
		ActorPlan: actorPlan.String(),
	}), nil
}
