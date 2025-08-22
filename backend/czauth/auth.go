package czauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"connectrpc.com/authn"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/samouraiworld/zenao/backend/mapsl"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// czauth means clerk zenao auth and is a clerk client wrapper implementing the zeni.Auth interface

type clerkZenaoAuth struct {
	logger *zap.Logger
}

func SetupAuth(clerkSecretKey string, logger *zap.Logger) (zeni.Auth, error) {
	clerk.SetKey(clerkSecretKey)
	return &clerkZenaoAuth{
		logger: logger,
	}, nil
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
	if len(ids) == 0 {
		return []*zeni.AuthUser{}, nil
	}

	// ids set to keep track of the ids that have been processed
	pending := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		pending[id] = struct{}{}
	}

	// Map of returned users - used to rebuild slice ordered as given
	limit := 500
	found := make(map[string]*zeni.AuthUser)

	for len(pending) > 0 {
		chunk := make([]string, 0, limit)
		for id := range pending {
			chunk = append(chunk, id)
			if len(chunk) >= limit {
				break
			}
		}

		params := &user.ListParams{
			UserIDs: chunk,
		}
		params.Limit = clerk.Int64(int64(limit))

		userList, err := user.List(ctx, params)
		if err != nil {
			return nil, err
		}

		// assume remaining IDs are invalid
		if len(userList.Users) == 0 {
			return nil, fmt.Errorf("no clerk users found for ids: %v", chunk)
		}

		for _, u := range userList.Users {
			found[u.ID] = toAuthUser(u)
			delete(pending, u.ID)
		}
	}

	// Preserve original order
	var ordered []*zeni.AuthUser
	for _, id := range ids {
		if u, ok := found[id]; ok {
			ordered = append(ordered, u)
		}
	}

	return ordered, nil
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
	emails = mapsl.Map(emails, strings.ToLower)

	existing, err := user.List(ctx, &user.ListParams{EmailAddresses: emails})
	if err != nil {
		return nil, err
	}

	return mapsl.MapErr(emails, func(email string) (*zeni.AuthUser, error) {
		idx := slices.IndexFunc(existing.Users, func(u *clerk.User) bool {
			return slices.ContainsFunc(u.EmailAddresses, func(cm *clerk.EmailAddress) bool {
				return cm.EmailAddress == email
			})
		})
		if idx != -1 {
			return toAuthUser(existing.Users[idx]), nil
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

		return toAuthUser(clerkUser), nil
	})
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
	email := ""
	if clerkUser.PrimaryEmailAddressID != nil {
		emailIdx := slices.IndexFunc(clerkUser.EmailAddresses, func(cm *clerk.EmailAddress) bool {
			return cm.ID == *clerkUser.PrimaryEmailAddressID
		})
		if emailIdx != -1 {
			email = clerkUser.EmailAddresses[emailIdx].EmailAddress
		}
	}

	return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email, Provider: "clerk"}
}
