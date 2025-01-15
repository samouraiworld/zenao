package main

import (
	"context"
	"errors"

	"connectrpc.com/authn"
	"connectrpc.com/connect"
	"github.com/clerk/clerk-sdk-go/v2"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) CreateEvent(
	ctx context.Context,
	req *connect.Request[zenaov1.CreateEventRequest],
) (*connect.Response[zenaov1.CreateEventResponse], error) {
	user := authn.GetInfo(ctx).(*clerk.User)
	s.Logger.Info("user", zap.String("id", user.ID), zap.Bool("banned", user.Banned))
	if user.Banned {
		return nil, errors.New("user is banned")
	}

	userRealmPkgPath, err := getOrCreateUserRealm(user.ID)
	if err != nil {
		return nil, err
	}

	eventRealmPkgPath, err := createEventRealm(userRealmPkgPath)
	if err != nil {
		return nil, err
	}

	_ = eventRealmPkgPath

	res := connect.NewResponse(&zenaov1.CreateEventResponse{})
	return res, nil
}

func getOrCreateUserRealm(userID string) (string, error) {
	return "", errors.New("not implemented")
}

func createEventRealm(userRealmPkgPath string) (string, error) {
	return "", errors.New("not implemented")
}
