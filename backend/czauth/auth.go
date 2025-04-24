package czauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"

	"connectrpc.com/authn"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/samouraiworld/zenao/backend/zeni"
)

// czauth means clerk zenao auth and is a clerk client wrapper implementing the zeni.Auth interface

type clerkZenaoAuth struct{}

func SetupAuth(clerkSecretKey string) (zeni.Auth, error) {
	clerk.SetKey(clerkSecretKey)
	return &clerkZenaoAuth{}, nil
}

// GetUser implements zeni.Auth.
func (c *clerkZenaoAuth) GetUser(ctx context.Context) *zeni.AuthUser {
	iUser := authn.GetInfo(ctx)
	if iUser == nil {
		return nil
	}
	clerkUser := iUser.(*clerk.User)
	email := ""
	if len(clerkUser.EmailAddresses) != 0 {
		email = clerkUser.EmailAddresses[0].EmailAddress
	}
	return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}
}

// GetUsersFromIDs implements zeni.Auth.
func (c *clerkZenaoAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	userList, err := user.List(ctx, &user.ListParams{UserIDs: ids})
	if err != nil {
		return nil, err
	}
	users := make([]*zeni.AuthUser, len(userList.Users))
	for i, clerkUser := range userList.Users {
		email := ""
		if len(clerkUser.EmailAddresses) != 0 {
			email = clerkUser.EmailAddresses[0].EmailAddress
		}
		users[i] = &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}
	}
	return users, nil
}

// EnsureUserExists implements zeni.Auth.
func (c *clerkZenaoAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	existing, err := user.List(ctx, &user.ListParams{EmailAddressQuery: &email})
	if err != nil {
		return nil, err
	}
	if len(existing.Users) != 0 {
		clerkUser := existing.Users[0]
		return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}, nil
	}

	passwordBz := make([]byte, 32)
	if _, err := rand.Read(passwordBz); err != nil {
		return nil, err
	}
	password := base64.RawURLEncoding.EncodeToString(passwordBz)

	clerkUser, err := user.Create(ctx, &user.CreateParams{
		EmailAddresses: &[]string{email},
		Password:       &password,
	})
	if err != nil {
		return nil, err
	}
	return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}, nil
}

// WithAuth implements zeni.Auth.
func (c *clerkZenaoAuth) WithAuth() func(http.Handler) http.Handler {
	return authn.NewMiddleware(func(_ context.Context, req *http.Request) (any, error) {
		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			return nil, nil
		}

		sessionToken := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := jwt.Verify(req.Context(), &jwt.VerifyParams{
			Token: sessionToken,
		})
		if err != nil {
			return nil, err
		}

		usr, err := user.Get(req.Context(), claims.Subject)
		if err != nil {
			return nil, err
		}
		return usr, nil
	}).Wrap
}
