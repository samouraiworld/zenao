package main

import (
	"encoding/base64"
	"fmt"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	tm2client "github.com/gnolang/gno/tm2/pkg/bft/rpc/client"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type gnoZenaoChain struct {
	adminMnemonic      string
	eventsIndexPkgPath string
	chainID            string
	chainEndpoint      string
	logger             *zap.Logger
}

// CreateEvent implements ZenaoChain.
func (g *gnoZenaoChain) CreateEvent(evtID string, creatorID string, req *zenaov1.CreateEventRequest) error {
	signer, err := gnoclient.SignerFromBip39(g.adminMnemonic, g.chainID, "", 0, 0)
	if err != nil {
		return err
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return err
	}

	tmClient, err := tm2client.NewHTTPClient(g.chainEndpoint)
	if err != nil {
		return err
	}
	defer tmClient.Close()

	client := gnoclient.Client{Signer: signer, RPCClient: tmClient}

	/*
		userRealmPkgPath, err := getOrCreateUserRealm(user.ID)
		if err != nil {
			return nil, err
		}

		eventRealmPkgPath, err := createEventRealm(userRealmPkgPath)
		if err != nil {
			return nil, err
		}

		_ = eventRealmPkgPath
	*/

	broadcastRes, err := client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "AddEvent",
		Args: []string{
			evtID,
			creatorID,
			fmt.Sprintf("%d", req.EndDate),
		},
	})
	if err != nil {
		return err
	}
	if broadcastRes.CheckTx.Error != nil {
		return fmt.Errorf("%w\n%s", broadcastRes.CheckTx.Error, broadcastRes.CheckTx.Log)
	}
	if broadcastRes.DeliverTx.Error != nil {
		return fmt.Errorf("%w\n%s", broadcastRes.DeliverTx.Error, broadcastRes.DeliverTx.Log)
	}

	g.logger.Info("broadcasted tx", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

var _ ZenaoChain = (*gnoZenaoChain)(nil)
