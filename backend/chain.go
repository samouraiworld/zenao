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
	"github.com/gnolang/gno/tm2/pkg/crypto"
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
	chainCreatorID := strings.ToLower(strings.TrimPrefix(creatorID, "user_"))
	creatorRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/users/u%s`, chainCreatorID)
	creatorRealmAddr := derivePkgAddr(creatorRealmPkgPath)
	eventRealmSrc, err := generateEventRealmSource(evtID, creatorRealmAddr, req)
	if err != nil {
		return err
	}

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

	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
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

	g.logger.Info("indexed event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

func (g *gnoZenaoChain) CreateUser(userID string) error {
	userRealmSrc, err := generateUserRealmSource(userID)
	if err != nil {
		return err
	}

	chainUserID := strings.ToLower(strings.TrimPrefix(userID, "user_"))
	userRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/users/u%s`, chainUserID)

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

// EditUser implements ZenaoChain.
func (g *gnoZenaoChain) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	chainUserID := strings.ToLower(strings.TrimPrefix(userID, "user_"))
	userRealmPkgPath := fmt.Sprintf(`gno.land/r/zenao/users/u%s`, chainUserID)

	broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: userRealmPkgPath,
		Func:    "EditUser",
		Args: []string{
			req.DisplayName,
			req.Bio,
			req.AvatarUri,
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("edited user", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

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

func generateUserRealmSource(id string) (string, error) {
	m := map[string]string{
		"id": id,
	}

	t := template.Must(template.New("").Parse(userRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func derivePkgAddr(pkgPath string) string {
	return string(crypto.AddressFromPreimage([]byte("pkgPath:" + pkgPath)).Bech32())
}

const eventRealmSourceTemplate = `package event

import (
	"std"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/zenao/events"
	"gno.land/r/demo/profile"
)

var event *events.Event

func init() {
	eventID := "{{.id}}"
	creator := "{{.creatorID}}"
	event = events.NewEvent(eventID, creator, "{{.req.Title}}", "{{.req.Description}}" ,{{.req.StartDate}}, {{.req.EndDate}}, {{.req.TicketPrice}}, {{.req.Capacity}}, profile.GetStringField) 

	profile.SetStringField(profile.DisplayName, "{{.req.Title}}")
	profile.SetStringField(profile.Bio, "{{.req.Description}}")
	profile.SetStringField(profile.Avatar, "{{.req.ImageUri}}")
}

func AddParticipant(participant string) {
	event.AddParticipant(participant)
}

func RemoveParticipant(participant string) {
	event.RemoveParticipant(participant)
}

func AddGatekeeper(gatekeeper string) {
	event.AddGatekeeper(gatekeeper)
}

func RemoveGatekeeper(gatekeeper string) {
	event.RemoveGatekeeper(gatekeeper)
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.Image("Event presentation", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	s += md.BulletList([]string{
		ufmt.Sprintf("Time: From %s to %s", time.Unix(event.GetStartDate(), 0).Format(time.DateTime), time.Unix(event.GetEndDate(), 0).Format(time.DateTime)),
		ufmt.Sprintf("Price: %g€", event.GetTicketPrice()),
		ufmt.Sprintf("Capacity: %d/%d", event.CountParticipants(), event.GetCapacity()),
		ufmt.Sprintf("Organizer: %s", profile.GetStringField(std.Address(event.GetCreator()), profile.DisplayName, "")),
	}) + "\n"
	s += md.HorizontalRule()
	s += md.Paragraph(std.CurrentRealm().Addr().String())
	return s
}
`

const userRealmSourceTemplate = `package user

import (
	"std"

	"gno.land/p/moul/md"
	"gno.land/p/zenao/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	user = users.NewUser("{{.id}}")
}

func TransferOwnership(newOwner string) {
	user.TransferOwnership(newOwner)
}
	
func EditUser(displayName, bio, avatar string) {
	if !user.IsOwner() {
		panic("caller is not owner/admin of the user realm")
	}
	profile.SetStringField(profile.DisplayName, displayName)
	profile.SetStringField(profile.Bio, bio)
	profile.SetStringField(profile.Avatar, avatar)
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.Image("User avatar", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	return s
}
`
