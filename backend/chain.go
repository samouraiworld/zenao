package main

import (
	"encoding/base64"
	"fmt"
	"strings"
	"text/template"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm"
	tm2client "github.com/gnolang/gno/tm2/pkg/bft/rpc/client"
	ctypes "github.com/gnolang/gno/tm2/pkg/bft/rpc/core/types"
	"github.com/gnolang/gno/tm2/pkg/crypto/keys"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

type gnoZenaoChain struct {
	client             gnoclient.Client
	eventsIndexPkgPath string
	signerInfo         keys.Info
	logger             *zap.Logger
}

func setupChain(adminMnemonic string, eventsIndexPkgPath string, chainID string, chainEndpoint string, logger *zap.Logger) (*gnoZenaoChain, error) {
	signer, err := gnoclient.SignerFromBip39(adminMnemonic, chainID, "", 0, 0)
	if err != nil {
		return nil, err
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return nil, err
	}

	tmClient, err := tm2client.NewHTTPClient(chainEndpoint)
	if err != nil {
		return nil, err
	}

	client := gnoclient.Client{Signer: signer, RPCClient: tmClient}

	return &gnoZenaoChain{
		client:             client,
		eventsIndexPkgPath: eventsIndexPkgPath,
		signerInfo:         signerInfo,
		logger:             logger,
	}, nil
}

// CreateEvent implements ZenaoChain.
func (g *gnoZenaoChain) CreateEvent(evtID string, creatorID string, req *zenaov1.CreateEventRequest) error {
	eventRealmSrc, err := generateEventRealmSource(evtID, creatorID, req)
	if err != nil {
		return err
	}
	g.logger.Info("generated event realm source", zap.String("src", eventRealmSrc))

	// TODO: single tx with all messages

	eventRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/events/e%s`, evtID)

	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name:  "event",
			Path:  eventRealmPkgPath,
			Files: []*gnovm.MemFile{{Name: "event.gno", Body: eventRealmSrc}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("created event realm", zap.String("pkg-path", eventRealmPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// CreateUser implements ZenaoChain.
func (g *gnoZenaoChain) CreateUser(id string, username string) error {
	userRealmSrc, err := generateUserRealmSource(id, username)
	if err != nil {
		return err
	}

	userRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/users/u%s`, id)

	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name:  "user",
			Path:  userRealmPkgPath,
			Files: []*gnovm.MemFile{{Name: "user.gno", Body: userRealmSrc}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("created user realm", zap.String("pkg-path", userRealmPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

var _ ZenaoChain = (*gnoZenaoChain)(nil)

func checkBroadcastErr(broadcastRes *ctypes.ResultBroadcastTxCommit, baseErr error) (*ctypes.ResultBroadcastTxCommit, error) {
	if baseErr != nil {
		return nil, baseErr
	}
	if broadcastRes.CheckTx.Error != nil {
		return nil, fmt.Errorf("%w\n%s", broadcastRes.CheckTx.Error, broadcastRes.CheckTx.Log)
	}
	if broadcastRes.DeliverTx.Error != nil {
		return nil, fmt.Errorf("%w\n%s", broadcastRes.DeliverTx.Error, broadcastRes.DeliverTx.Log)
	}
	return broadcastRes, nil
}

func generateEventRealmSource(evtID string, creatorID string, req *zenaov1.CreateEventRequest) (string, error) {
	m := map[string]interface{}{
		"id":        evtID,
		"creatorID": creatorID,
		"req":       req,
	}
	t := template.Must(template.New("").Parse(eventRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func generateUserRealmSource(id string, username string) (string, error) {
	m := map[string]string{
		"id":       id,
		"username": username,
	}
	t := template.Must(template.New("").Parse(userRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

const eventRealmSourceTemplate = `package event

import (
	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
	"gno.land/r/zenao/events_reg"
)

var event *events.Event

func init() {
	eventID := "{{.id}}"
	creator := "{{.creatorID}}"
	event = events.NewEvent(eventID, creator, {{.req.StartDate}}, {{.req.EndDate}}, {{.req.TicketPrice}}, {{.req.Capacity}}) 

	profile.SetStringField(profile.DisplayName, "{{.req.Title}}")
	profile.SetStringField(profile.Bio, "{{.req.Description}}")
	profile.SetStringField(profile.Avatar, "{{.req.ImageUri}}")
}

func AddParticipant(participant string) {
	event.AddParticipant(participant)
	events_reg.AddParticipant(event.GetID(), participant, event.GetEndDate())
}

func RemoveParticipant(participant string) {
	event.RemoveParticipant(participant)
	events_reg.RemoveParticipant(event.GetID(), participant, event.GetEndDate())
}

func AddGatekeeper(gatekeeper string) {
	event.AddGatekeeper(gatekeeper)
}

func RemoveGatekeeper(gatekeeper string) {
	event.RemoveGatekeeper(gatekeeper)
}

func Render(path string) string {
	return "Coming soon"
}
`

const userRealmSourceTemplate = `package user

import (
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	user = users.NewUser("{{.id}}", "{{.username}}")

	profile.SetStringField(profile.DisplayName, "{{.username}}")
	profile.SetStringField(profile.Bio, {{.description}})
	profile.SetStringField(profile.Avatar, {{.imageUri}})
}

func TransferOwnership(newOwner string) {
	user.TransferOwnership(newOwner)
}

func Render(path string) string {
	return "Coming soon"
}
`
