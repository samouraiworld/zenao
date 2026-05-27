package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func (s *ZenaoServer) GetUserOrders(
	ctx context.Context,
	req *connect.Request[zenaov1.GetUserOrdersRequest],
) (*connect.Response[zenaov1.GetUserOrdersResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("get-user-orders", zap.String("actor-id", actor.ID()), zap.Bool("acting-as-team", actor.IsTeam()))

	orders, err := s.DB.WithContext(ctx).ListOrdersByBuyer(actor.ID())
	if err != nil {
		return nil, err
	}

	summaries := make([]*zenaov1.OrderSummary, 0, len(orders))
	for _, order := range orders {
		if order == nil {
			continue
		}
		summaries = append(summaries, &zenaov1.OrderSummary{
			OrderId:      order.ID,
			EventId:      order.EventID,
			BuyerId:      order.BuyerID,
			AmountMinor:  order.AmountMinor,
			CurrencyCode: order.CurrencyCode,
			CreatedAt:    order.CreatedAt,
		})
	}

	return connect.NewResponse(&zenaov1.GetUserOrdersResponse{
		Orders: summaries,
	}), nil
}
