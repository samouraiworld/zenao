package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/account"
	"github.com/stripe/stripe-go/v81/accountlink"
)

func (s *ZenaoServer) CreateBusinessAccount(ctx context.Context, _ *connect.Request[zenaov1.CreateBusinessAccountRequest]) (*connect.Response[zenaov1.CreateBusinessAccountResponse], error) {
	user := s.GetUser(ctx)
	if user == nil || user.Banned {
		return nil, errors.New("unauthorized")
	}

	account, err := account.New(&stripe.AccountParams{Controller: &stripe.AccountControllerParams{
		Losses: &stripe.AccountControllerLossesParams{
			Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsStripe)),
		},
		Fees: &stripe.AccountControllerFeesParams{
			Payer: stripe.String(string(stripe.AccountControllerFeesPayerAccount)),
		},
		StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
			Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeFull)), // XXX: express better no?
		},
	}})
	if err != nil {
		return nil, err
	}

	organizer, err := s.DB.CreateOrganizer(user.ID, account.ID)
	if err != nil {
		return nil, err
	}

	accountLink, err := accountlink.New(&stripe.AccountLinkParams{
		Account:    stripe.String(organizer.StripeAccountID),
		ReturnURL:  stripe.String(frontendDomain),
		RefreshURL: stripe.String(frontendDomain),
		Type:       stripe.String("account_onboarding"),
	})

	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CreateBusinessAccountResponse{
		AccountLink: accountLink.URL,
	}), nil
}

// GetBusinessAccountLink implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) GetBusinessAccountLink(ctx context.Context, req *connect.Request[zenaov1.GetBusinessAccountLinkRequest]) (*connect.Response[zenaov1.GetBusinessAccountLinkResponse], error) {
	user := s.GetUser(ctx)
	if user == nil || user.Banned {
		return nil, errors.New("unauthorized")
	}

	// XXX: should only allow account of this user?

	accountLink, err := accountlink.New(&stripe.AccountLinkParams{
		Account:    stripe.String(req.Msg.Id),
		ReturnURL:  stripe.String(frontendDomain),
		RefreshURL: stripe.String(frontendDomain),
		Type:       stripe.String("account_onboarding"),
	})

	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.GetBusinessAccountLinkResponse{
		AccountLink: accountLink.URL,
	}), nil
}
