package czauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"slices"
	"strings"

	"connectrpc.com/authn"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/samouraiworld/zenao/backend/mapsl"
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
	return toAuthUser(clerkUser)
}

// GetUsersFromIDs implements zeni.Auth.
func (c *clerkZenaoAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	userList, err := user.List(ctx, &user.ListParams{UserIDs: ids})
	if err != nil {
		return nil, err
	}
	return mapsl.Map(userList.Users, toAuthUser), nil
}

// EnsureUserExists implements zeni.Auth.
func (c *clerkZenaoAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	users, err := c.EnsureUsersExists(ctx, []string{email})
	if err != nil {
		return nil, err
	}
	return users[0], nil
}

// EnsureUserExists implements zeni.Auth.
func (c *clerkZenaoAuth) EnsureUsersExists(ctx context.Context, emails []string) ([]*zeni.AuthUser, error) {
	existing, err := user.List(ctx, &user.ListParams{EmailAddresses: emails})
	if err != nil {
		return nil, err
	}

	clerkUsers := make([]*clerk.User, len(emails))

	for i, email := range emails {
		idx := slices.IndexFunc(existing.Users, func(u *clerk.User) bool {
			return slices.ContainsFunc(u.EmailAddresses, func(cm *clerk.EmailAddress) bool {
				return cm.EmailAddress == email
			})
		})
		if idx != -1 {
			clerkUsers[i] = existing.Users[idx]
			continue
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

		clerkUsers[i] = clerkUser
	}

	return mapsl.Map(clerkUsers, toAuthUser), nil
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

func toAuthUser(clerkUser *clerk.User) *zeni.AuthUser {
	emailIdx := slices.IndexFunc(clerkUser.EmailAddresses, func(cm *clerk.EmailAddress) bool {
		return cm.ID == *clerkUser.PrimaryEmailAddressID
	})
	email := ""
	if emailIdx != -1 {
		email = clerkUser.EmailAddresses[emailIdx].EmailAddress
	}

	return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}
}
