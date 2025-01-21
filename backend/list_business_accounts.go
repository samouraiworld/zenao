package main

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/stripe/stripe-go/v81/account"
	"go.uber.org/zap"
)

// ListBusinessAccounts implements zenaov1connect.ZenaoServiceHandler.
func (s *ZenaoServer) ListBusinessAccounts(ctx context.Context, _ *connect.Request[zenaov1.ListBusinessAccountsRequest]) (*connect.Response[zenaov1.ListBusinessAccountsResponse], error) {
	user := s.GetUser(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	accs, err := s.DB.GetBusinessAccounts(user.ID)
	if err != nil {
		return nil, err
	}

	res := []*zenaov1.BusinessAccount{}
	for _, acc := range accs {
		stripeAcc, err := account.GetByID(acc.StripeAccountID, nil)
		if err != nil {
			s.Logger.Warn("failed to fetch stripe account", zap.Error(err), zap.String("id", acc.StripeAccountID), zap.String("user-id", acc.UserID))
			continue
		}
		compName := ""
		if stripeAcc.Company != nil {
			compName = stripeAcc.Company.Name
		}
		res = append(res, &zenaov1.BusinessAccount{
			Id:          stripeAcc.ID,
			CompanyName: compName,
			Email:       stripeAcc.Email,
			CanCharge:   stripeAcc.ChargesEnabled,
		})
	}

	return connect.NewResponse(&zenaov1.ListBusinessAccountsResponse{
		Accounts: res,
	}), nil
}
