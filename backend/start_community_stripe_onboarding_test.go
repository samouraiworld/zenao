package main

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v84"
	"go.uber.org/zap"
)

type fakeStripeGateway struct {
	identity stripeGatewayIdentity
	inspect  func(context.Context) (stripeGatewayIdentity, error)
	create   func(context.Context, string, string) (*stripe.Account, error)
	get      func(context.Context, string) (*stripe.Account, error)
	link     func(context.Context, string, string, string) (string, error)
}

func (f *fakeStripeGateway) Identity(ctx context.Context) (stripeGatewayIdentity, error) {
	if f.inspect != nil {
		return f.inspect(ctx)
	}
	if f.identity.AccountID != "" {
		return f.identity, nil
	}
	return stripeGatewayIdentity{AccountID: "acct_platform"}, nil
}
func (f *fakeStripeGateway) Create(c context.Context, key, op string) (*stripe.Account, error) {
	if f.create == nil {
		panic("unexpected Stripe create")
	}
	return f.create(c, key, op)
}
func (f *fakeStripeGateway) Get(c context.Context, id string) (*stripe.Account, error) {
	if f.get != nil {
		return f.get(c, id)
	}
	return &stripe.Account{ID: id}, nil
}
func (f *fakeStripeGateway) Link(c context.Context, id, r, u string) (string, error) {
	if f.link == nil {
		panic("unexpected Stripe link")
	}
	return f.link(c, id, r, u)
}

func onboardingFixture(t *testing.T) (*ZenaoServer, string, *sql.DB) {
	t.Helper()
	db, raw := ztesting.SetupTestDB(t)
	auth := &stubAuth{user: &zeni.AuthUser{ID: "onboarding-admin"}}
	u, e := db.CreateUser(auth.user.ID)
	require.NoError(t, e)
	c, e := db.CreateCommunity(u.ID, []string{u.ID}, nil, nil, &zenaov1.CreateCommunityRequest{DisplayName: "Payment test"})
	require.NoError(t, e)
	return &ZenaoServer{DB: db, Auth: auth, Logger: zap.NewNop(), StripeSecretKey: "sk_test_unused", AppBaseURL: "https://example.test"}, c.ID, raw
}
func startOnboarding(s *ZenaoServer, id string) (*connect.Response[zenaov1.StartCommunityStripeOnboardingResponse], error) {
	return s.StartCommunityStripeOnboarding(context.Background(), connect.NewRequest(&zenaov1.StartCommunityStripeOnboardingRequest{CommunityId: id, ReturnPath: "/return", RefreshPath: "/refresh"}))
}

func TestOnboardingLinkFailurePersistsAndResumesSameAccount(t *testing.T) {
	s, id, _ := onboardingFixture(t)
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	creates, links := 0, 0
	s.StripeOnboardingGateway = &fakeStripeGateway{create: func(context.Context, string, string) (*stripe.Account, error) {
		creates++
		return &stripe.Account{ID: "acct_seller"}, nil
	}, link: func(_ context.Context, account, _, _ string) (string, error) {
		require.Equal(t, "acct_seller", account)
		links++
		if links == 1 {
			return "", errors.New("link failed")
		}
		return "https://connect.stripe.test/resume", nil
	}}
	_, e := startOnboarding(s, id)
	require.Error(t, e)
	p, e := s.DB.GetPaymentAccountByCommunityPlatform(id, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, "acct_seller", p.PlatformAccountID)
	now = now.Add(48 * time.Hour)
	r, e := startOnboarding(s, id)
	require.NoError(t, e)
	require.NotEmpty(t, r.Msg.OnboardingUrl)
	require.Equal(t, 1, creates)
	require.Equal(t, 2, links)
}

func TestPayoutLegacyVerificationBindsOnlySuccessfulScope(t *testing.T) {
	s, id, raw := onboardingFixture(t)
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	_, e := s.DB.UpsertPaymentAccount(&zeni.PaymentAccount{CommunityID: id, PlatformType: zeni.PaymentPlatformStripeConnect, PlatformAccountID: "acct_legacy", OnboardingState: zeni.PaymentOnboardingStateStarted, StartedAt: now, VerificationState: zeni.PaymentVerificationStatePending})
	require.NoError(t, e)
	g := &fakeStripeGateway{identity: stripeGatewayIdentity{AccountID: "acct_owner", LiveMode: true}, get: func(context.Context, string) (*stripe.Account, error) {
		return nil, errors.New("provider unavailable")
	}}
	s.StripeOnboardingGateway = g
	read := func() (*connect.Response[zenaov1.GetCommunityPayoutStatusResponse], error) {
		return s.GetCommunityPayoutStatus(context.Background(), connect.NewRequest(&zenaov1.GetCommunityPayoutStatusRequest{CommunityId: id}))
	}
	r, e := read()
	require.NoError(t, e)
	require.True(t, r.Msg.IsStale)
	var owner string
	require.NoError(t, raw.QueryRow("SELECT platform_account_id FROM stripe_onboarding_operations WHERE community_id=?", id).Scan(&owner))
	require.Empty(t, owner)
	g.get = func(context.Context, string) (*stripe.Account, error) { return &stripe.Account{ID: "acct_legacy"}, nil }
	_, e = read()
	require.NoError(t, e)
	var mode bool
	var fence uint64
	require.NoError(t, raw.QueryRow("SELECT platform_account_id,live_mode,fence FROM stripe_onboarding_operations WHERE community_id=?", id).Scan(&owner, &mode, &fence))
	require.Equal(t, "acct_owner", owner)
	require.True(t, mode)
	require.EqualValues(t, 1, fence)
	now = now.Add(stripeAccountVerificationTTL)
	g.get = func(context.Context, string) (*stripe.Account, error) {
		t.Fatal("mismatched scope must not retrieve seller")
		return nil, nil
	}
	g.identity.AccountID = "acct_other_owner"
	_, e = read()
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	g.identity.AccountID = "acct_owner"
	g.identity.LiveMode = false
	_, e = read()
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
}

func TestOnboardingUnknownOutcomeKeepsKeyAndStopsAfterWindow(t *testing.T) {
	s, id, _ := onboardingFixture(t)
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	var keys []string
	s.StripeOnboardingGateway = &fakeStripeGateway{create: func(_ context.Context, key, _ string) (*stripe.Account, error) {
		keys = append(keys, key)
		return nil, errors.New("timeout after send")
	}}
	_, e := startOnboarding(s, id)
	require.Error(t, e)
	now = now.Add(time.Hour)
	_, e = startOnboarding(s, id)
	require.Error(t, e)
	require.Len(t, keys, 2)
	require.Equal(t, keys[0], keys[1])
	now = now.Add(24 * time.Hour)
	_, e = startOnboarding(s, id)
	require.ErrorIs(t, e, zeni.ErrOnboardingReconciliation)
	require.Len(t, keys, 2)
}

func TestOnboardingLateWorkerCannotPublishLink(t *testing.T) {
	s, id, _ := onboardingFixture(t)
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	s.StripeOnboardingGateway = &fakeStripeGateway{create: func(context.Context, string, string) (*stripe.Account, error) {
		return &stripe.Account{ID: "acct_seller"}, nil
	}, link: func(context.Context, string, string, string) (string, error) {
		now = now.Add(zeni.StripeOnboardingLease)
		return "https://connect.stripe.test/late", nil
	}}
	r, e := startOnboarding(s, id)
	require.ErrorIs(t, e, zeni.ErrOnboardingFence)
	require.Nil(t, r)
	p, e := s.DB.GetPaymentAccountByCommunityPlatform(id, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, "acct_seller", p.PlatformAccountID)
}

func TestOnboardingUnauthorizedAndInvalidCallbacksHaveNoSideEffects(t *testing.T) {
	s, id, _ := onboardingFixture(t)
	s.StripeOnboardingGateway = &fakeStripeGateway{}
	_, e := s.StartCommunityStripeOnboarding(context.Background(), connect.NewRequest(&zenaov1.StartCommunityStripeOnboardingRequest{CommunityId: id, ReturnPath: "https://evil.test", RefreshPath: "/refresh"}))
	require.Error(t, e)
	u, e := s.DB.CreateUser("other-auth")
	require.NoError(t, e)
	_ = u
	s.Auth = &stubAuth{user: &zeni.AuthUser{ID: "other-auth"}}
	_, e = startOnboarding(s, id)
	require.Error(t, e)
}

func TestOnboardingRevokedAdminBeforeClaimHasNoSideEffects(t *testing.T) {
	s, id, raw := onboardingFixture(t)
	inspected := false
	s.StripeOnboardingGateway = &fakeStripeGateway{inspect: func(context.Context) (stripeGatewayIdentity, error) {
		inspected = true
		// The initial handler authorization has already passed. Simulate a
		// committed role revocation before the atomic claim authorization.
		r, e := raw.Exec("DELETE FROM entity_roles WHERE org_type=? AND org_id=? AND role=?", zeni.EntityTypeCommunity, id, zeni.RoleAdministrator)
		require.NoError(t, e)
		n, e := r.RowsAffected()
		require.NoError(t, e)
		require.Positive(t, n)
		return stripeGatewayIdentity{AccountID: "acct_platform"}, nil
	}}
	_, e := startOnboarding(s, id)
	require.True(t, inspected)
	require.ErrorIs(t, e, zeni.ErrOnboardingUnauthorized)
	var count int
	require.NoError(t, raw.QueryRow("SELECT count(*) FROM stripe_onboarding_operations WHERE community_id=?", id).Scan(&count))
	require.Zero(t, count)
	// The fake panics if create/link is called; no external side effect occurs.
}

func TestPayoutStaleObservationReloadsWinnerAndFreshRestrictionDowngrades(t *testing.T) {
	s, id, _ := onboardingFixture(t)
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	_, e := s.DB.UpsertPaymentAccount(&zeni.PaymentAccount{CommunityID: id, PlatformType: zeni.PaymentPlatformStripeConnect, PlatformAccountID: "acct_seller", OnboardingState: zeni.PaymentOnboardingStateStarted, StartedAt: now, VerificationState: zeni.PaymentVerificationStatePending})
	require.NoError(t, e)
	started, release := make(chan struct{}), make(chan struct{})
	var mu sync.Mutex
	calls := 0
	s.StripeOnboardingGateway = &fakeStripeGateway{get: func(context.Context, string) (*stripe.Account, error) {
		mu.Lock()
		calls++
		n := calls
		mu.Unlock()
		if n == 1 {
			close(started)
			<-release
			return &stripe.Account{ID: "acct_seller"}, nil
		}
		return &stripe.Account{ID: "acct_seller", DetailsSubmitted: true, ChargesEnabled: true, PayoutsEnabled: true}, nil
	}}
	read := func() (*connect.Response[zenaov1.GetCommunityPayoutStatusResponse], error) {
		return s.GetCommunityPayoutStatus(context.Background(), connect.NewRequest(&zenaov1.GetCommunityPayoutStatusRequest{CommunityId: id}))
	}
	type result struct {
		r *connect.Response[zenaov1.GetCommunityPayoutStatusResponse]
		e error
	}
	first := make(chan result, 1)
	go func() { r, e := read(); first <- result{r, e} }()
	<-started
	winner, e := read()
	require.NoError(t, e)
	require.Equal(t, zeni.PaymentVerificationStateVerified, winner.Msg.VerificationState)
	close(release)
	old := <-first
	require.NoError(t, old.e)
	require.Equal(t, zeni.PaymentVerificationStateVerified, old.r.Msg.VerificationState)
	require.True(t, old.r.Msg.IsStale)
	now = now.Add(6 * time.Minute)
	s.StripeOnboardingGateway = &fakeStripeGateway{get: func(context.Context, string) (*stripe.Account, error) {
		return &stripe.Account{ID: "acct_seller", DetailsSubmitted: true, Requirements: &stripe.AccountRequirements{DisabledReason: "requirements.past_due"}}, nil
	}}
	fresh, e := read()
	require.NoError(t, e)
	require.Equal(t, zeni.PaymentVerificationStateFailed, fresh.Msg.VerificationState)
	p, e := s.DB.GetPaymentAccountByCommunityPlatform(id, zeni.PaymentPlatformStripeConnect)
	require.NoError(t, e)
	require.Equal(t, zeni.PaymentVerificationStateFailed, p.VerificationState)
}

func TestOnboardingCreateSuccessPersistenceFailureSurvivesRestart(t *testing.T) {
	s, id, raw := onboardingFixture(t)
	_, e := raw.Exec("CREATE TRIGGER fail_onboarding_mapping BEFORE INSERT ON payment_accounts BEGIN SELECT RAISE(ABORT, 'injected persistence split'); END")
	require.NoError(t, e)
	cache := map[string]string{}
	calls, sideEffects := 0, 0
	g := &fakeStripeGateway{create: func(_ context.Context, key, _ string) (*stripe.Account, error) {
		calls++
		id := cache[key]
		if id == "" {
			sideEffects++
			id = "acct_once"
			cache[key] = id
		}
		return &stripe.Account{ID: id}, nil
	}, link: func(context.Context, string, string, string) (string, error) {
		return "https://connect.stripe.test/resume", nil
	}}
	now := time.Now().UTC()
	s.StripeOnboardingClock = func() time.Time { return now }
	s.StripeOnboardingGateway = g
	_, e = startOnboarding(s, id)
	require.Error(t, e)
	_, e = raw.Exec("DROP TRIGGER fail_onboarding_mapping")
	require.NoError(t, e)
	// A new server/process only has the DB and provider, not in-memory results.
	restarted := &ZenaoServer{DB: s.DB, Auth: s.Auth, Logger: zap.NewNop(), StripeSecretKey: s.StripeSecretKey, AppBaseURL: s.AppBaseURL, StripeOnboardingGateway: g, StripeOnboardingClock: func() time.Time { return now }}
	now = now.Add(zeni.StripeOnboardingLease)
	r, e := startOnboarding(restarted, id)
	require.NoError(t, e)
	require.NotEmpty(t, r.Msg.OnboardingUrl)
	require.Equal(t, 2, calls)
	require.Equal(t, 1, sideEffects)
	require.Len(t, cache, 1)
}

type stripeTestTransport func(*http.Request) (*http.Response, error)

func (f stripeTestTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestStripeGatewayIgnoresMutableGlobalCredential(t *testing.T) {
	const key = "sk_test_fixture_only"
	var authorization []string
	transport := stripeTestTransport(func(r *http.Request) (*http.Response, error) {
		authorization = append(authorization, r.Header.Get("Authorization"))
		body := `{"id":"acct_seller"}`
		if r.URL.Path == "/v1/account" {
			body = `{"id":"acct_platform"}`
		} else if r.URL.Path == "/v1/account_links" {
			body = `{"url":"https://connect.stripe.test/link"}`
		}
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body))}, nil
	})
	g := newCredentialStripeGateway(key)
	g.client = stripe.NewClient(key, stripe.WithBackends(stripe.NewBackendsWithConfig(&stripe.BackendConfig{HTTPClient: &http.Client{Transport: transport}})))
	identity, e := g.Identity(context.Background())
	require.NoError(t, e)
	require.Equal(t, "acct_platform", identity.AccountID)
	require.False(t, identity.LiveMode)
	old := stripe.Key
	stripe.Key = "sk_live_unrelated_fixture"
	defer func() { stripe.Key = old }()
	_, e = g.Create(context.Background(), "operation-key", "operation-id")
	require.NoError(t, e)
	_, e = g.Get(context.Background(), "acct_seller")
	require.NoError(t, e)
	_, e = g.Link(context.Background(), "acct_seller", "https://example.test/return", "https://example.test/refresh")
	require.NoError(t, e)
	require.Len(t, authorization, 4)
	for _, a := range authorization {
		require.Contains(t, a, key)
		require.NotContains(t, a, "unrelated")
	}
}
