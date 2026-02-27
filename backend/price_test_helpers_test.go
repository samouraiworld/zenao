package main

import (
	"context"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
	"github.com/samouraiworld/zenao/backend/zeni"
)

type priceStubAuth struct {
	user *zeni.AuthUser
}

func (a *priceStubAuth) GetUser(ctx context.Context) *zeni.AuthUser {
	return a.user
}

func (a *priceStubAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) EnsureUsersExists(ctx context.Context, emails []string) ([]*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) WithAuth() func(http.Handler) http.Handler {
	return func(handler http.Handler) http.Handler { return handler }
}
