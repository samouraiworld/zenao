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

	eventRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/events/e%s`, evtID)

	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "100000ugnot",
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

	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "AddEvent",
		Args: []string{
			evtID,
			creatorID,
			fmt.Sprintf("%d", req.EndDate),
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("indexed event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

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
	t := template.Must(template.New("").Parse(realmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

const realmSourceTemplate = `package event

import (
	"std"

	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/r/demo/profile"
)

var (
	id = "{{.id}}"
	creator = "{{.creatorID}}"
)

func init() {
	profile.SetStringField(profile.DisplayName, "{{.req.Title}}")
	profile.SetStringField(profile.Bio, "{{.req.Description}}")
	profile.SetStringField(profile.Avatar, "{{.req.ImageUri}}")
}

func getInfoJSON() string {
	obj := json.ObjectNode("", map[string]*json.Node{
		"title":       json.StringNode("", profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, "")),
		"description": json.StringNode("", profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, "")),
		"imageUri":    json.StringNode("", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, "")),
		"startDate":   json.StringNode("", ufmt.Sprintf("%d", {{.req.StartDate}})),
		"endDate":     json.StringNode("", ufmt.Sprintf("%d", {{.req.EndDate}})),
		"ticketPrice": json.NumberNode("", {{.req.TicketPrice}}),
		"capacity":    json.NumberNode("", {{.req.Capacity}}),
	})

	bz, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	return string(bz)
}

func Render(path string) string {
	s := ""
	s += md.H1("Event")
	s += std.CurrentRealm().Addr().String() + "\n"
	s += md.CodeBlock(getInfoJSON())
	return s
}
`
