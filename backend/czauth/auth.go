package czauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"connectrpc.com/authn"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwks"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/samouraiworld/zenao/backend/mapsl"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

// czauth means clerk zenao auth and is a clerk client wrapper implementing the zeni.Auth interface

type clerkZenaoAuth struct {
	logger     *zap.Logger
	client     *user.Client
	jwksClient *jwks.Client
	store      JWKStore
}

func SetupAuth(clerkSecretKey string, logger *zap.Logger) (zeni.Auth, error) {
	httpClient := &http.Client{
		Transport: otelhttp.NewTransport(http.DefaultTransport),
	}

	config := &clerk.ClientConfig{}
	config.Key = &clerkSecretKey
	config.HTTPClient = httpClient
	client := user.NewClient(config)
	jwksClient := jwks.NewClient(config)
	return &clerkZenaoAuth{
		logger:     logger,
		client:     client,
		jwksClient: jwksClient,
		store:      NewJWKStore(),
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

		userList, err := c.client.List(ctx, params)
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
	if len(emails) == 0 {
		return nil, nil
	}

	spanCtx, span := otel.Tracer("czauth").Start(
		ctx,
		"czauth.EnsureUsersExists",
		trace.WithSpanKind(trace.SpanKindClient),
	)
	defer span.End()
	ctx = spanCtx

	emails = mapsl.Map(emails, strings.ToLower)

	existing, err := c.client.List(ctx, &user.ListParams{EmailAddresses: emails})
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

		clerkUser, err := c.client.Create(ctx, &user.CreateParams{
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
		ctx, span := otel.Tracer("czauth").Start(
			req.Context(),
			"czauth.WithAuth",
			trace.WithSpanKind(trace.SpanKindClient),
		)
		defer span.End()

		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			return nil, nil
		}

		sessionToken := strings.TrimPrefix(authHeader, "Bearer ")

		// Attempt to get the JSON Web Key from your store.
		jwk := c.store.GetJWK()
		if jwk == nil {
			// Decode the session JWT to find the key ID.
			unsafeClaims, err := jwt.Decode(ctx, &jwt.DecodeParams{
				Token: sessionToken,
			})
			if err != nil {
				return nil, errors.New("unauthorized")
			}

			// Fetch the JSON Web Key
			jwk, err = jwt.GetJSONWebKey(ctx, &jwt.GetJSONWebKeyParams{
				KeyID:      unsafeClaims.KeyID,
				JWKSClient: c.jwksClient,
			})
			if err != nil {
				return nil, errors.New("unauthorized")
			}
		}
		// Write the JSON Web Key to your store, so that next time
		// you can use the cached value.
		c.store.SetJWK(jwk)

		claims, err := jwt.Verify(ctx, &jwt.VerifyParams{
			Token: sessionToken,
			JWK:   jwk,
		})
		if err != nil {
			return nil, err
		}

		usr, err := c.client.Get(ctx, claims.Subject)
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

	return &zeni.AuthUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}
}

// Sample interface for JSON Web Key storage.
// Implementation may vary.
type JWKStore interface {
	GetJWK() *clerk.JSONWebKey
	SetJWK(*clerk.JSONWebKey)
}

// Implementation may vary. This can be an
// in-memory store, database, caching layer, etc.
// This example uses an in-memory store.
type InMemoryJWKStore struct {
	jwk *clerk.JSONWebKey
}

func (s *InMemoryJWKStore) GetJWK() *clerk.JSONWebKey {
	return s.jwk
}

func (s *InMemoryJWKStore) SetJWK(j *clerk.JSONWebKey) {
	s.jwk = j
}

func NewJWKStore() JWKStore {
	return &InMemoryJWKStore{}
}
