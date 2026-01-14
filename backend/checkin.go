package main

import (
	"context"

	"connectrpc.com/connect"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func (s *ZenaoServer) Checkin(ctx context.Context, req *connect.Request[zenaov1.CheckinRequest]) (*connect.Response[zenaov1.CheckinResponse], error) {
	actor, err := s.GetActor(ctx, req.Header())
	if err != nil {
		return nil, err
	}

	s.Logger.Info("checkin", zap.String("gatekeeper", actor.ID()), zap.String("pubkey", req.Msg.TicketPubkey), zap.Bool("acting-as-team", actor.IsTeam()))
	if err := s.DB.TxWithSpan(ctx, "db.Checkin", func(db zeni.DB) error {
		_, err = db.Checkin(req.Msg.TicketPubkey, actor.ID(), req.Msg.Signature)
		return err
	}); err != nil {
		return nil, err
	}

	return connect.NewResponse(&zenaov1.CheckinResponse{}), nil
}
