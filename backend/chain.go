package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"path"
	"strings"
	"text/template"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
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
	namespace          string
}

func setupChain(adminMnemonic string, namespace string, chainID string, chainEndpoint string, logger *zap.Logger) (*gnoZenaoChain, error) {
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
		eventsIndexPkgPath: path.Join("gno.land/r", namespace, "events_reg"),
		signerInfo:         signerInfo,
		logger:             logger,
		namespace:          namespace,
	}, nil
}

// CreateEvent implements ZenaoChain.
func (g *gnoZenaoChain) CreateEvent(evtID string, creatorID string, req *zenaov1.CreateEventRequest) error {
	creatorAddr := g.UserAddress(creatorID)

	eventRealmSrc, err := generateEventRealmSource(creatorAddr, g.signerInfo.GetAddress().String(), g.namespace, req)
	if err != nil {
		return err
	}

	g.logger.Info("creating event on chain", zap.String("pkg-path", g.eventRealmPkgPath(evtID)))

	// TODO: single tx with all messages

	eventPkgPath := g.eventRealmPkgPath(evtID)

	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name:  "event",
			Path:  eventPkgPath,
			Files: []*gnovm.MemFile{{Name: "event.gno", Body: eventRealmSrc}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("created event realm", zap.String("pkg-path", eventPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

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
	if err != nil {
		return err
	}

	g.logger.Info("indexed event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditEvent implements ZenaoChain.
func (g *gnoZenaoChain) EditEvent(evtID string, req *zenaov1.EditEventRequest) error {
	eventPkgPath := g.eventRealmPkgPath(evtID)

	broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: eventPkgPath,
		Func:    "EditEvent",
		Args: []string{
			req.Title,
			req.Description,
			req.ImageUri,
			fmt.Sprintf("%d", req.StartDate),
			fmt.Sprintf("%d", req.EndDate),
			fmt.Sprintf("%d", req.Capacity),
			req.Location,
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("edited event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// CreateUser implements ZenaoChain.
func (g *gnoZenaoChain) CreateUser(userID string) error {
	userRealmSrc, err := generateUserRealmSource(userID, g.namespace)
	if err != nil {
		return err
	}

	userPkgPath := g.userRealmPkgPath(userID)

	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name:  "user",
			Path:  userPkgPath,
			Files: []*gnovm.MemFile{{Name: "user.gno", Body: userRealmSrc}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("created user realm", zap.String("pkg-path", userPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// Participate implements ZenaoChain.
func (g *gnoZenaoChain) Participate(eventID string, userID string) error {
	eventPkgPath := g.eventRealmPkgPath(eventID)
	userPkgPath := g.userRealmPkgPath(userID)

	// XXX: this won't work because the admin of the event is the event
	broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: eventPkgPath,
		Func:    "AddParticipant",
		Args:    []string{gnolang.DerivePkgAddr(userPkgPath).String()},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("added participant", zap.String("user", userPkgPath), zap.String("event", eventPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditUser implements ZenaoChain.
func (g *gnoZenaoChain) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	userPkgPath := g.userRealmPkgPath(userID)

	broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: userPkgPath,
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

// UserAddress implements ZenaoChain.
func (g *gnoZenaoChain) UserAddress(userID string) string {
	return gnolang.DerivePkgAddr(g.userRealmPkgPath(userID)).String()
}

func (g *gnoZenaoChain) eventRealmPkgPath(eventID string) string {
	return fmt.Sprintf("gno.land/r/%s/events/e%s", g.namespace, eventID)
}

func (g *gnoZenaoChain) userRealmPkgPath(userID string) string {
	return fmt.Sprintf("gno.land/r/%s/users/u%s", g.namespace, userID)
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

func generateEventRealmSource(creatorAddr string, zenaoAdminAddr string, gnoNamespace string, req *zenaov1.CreateEventRequest) (string, error) {
	m := map[string]interface{}{
		"creatorAddr":    creatorAddr,
		"req":            req,
		"zenaoAdminAddr": zenaoAdminAddr,
		"namespace":      gnoNamespace,
	}
	toMarshal := map[string]interface{}{
		"title":       req.Title,
		"description": req.Description,
		"location":    req.Location,
		"imageURI":    req.ImageUri,
	}
	for key, val := range toMarshal {
		bz, err := json.Marshal(val)
		if err != nil {
			return "", err
		}
		m[key] = string(bz)
	}
	t := template.Must(template.New("").Parse(eventRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func generateUserRealmSource(id string, gnoNamespace string) (string, error) {
	m := map[string]string{
		"displayName": fmt.Sprintf("Zenao user #%s", id),
		"bio":         "Zenao managed user",
		"avatarURI":   "https://www.wikimedia.org/portal/wikimedia.org/assets/img/wikimedia_logo.png",
		"namespace":   gnoNamespace,
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
	"std"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	"gno.land/p/{{.namespace}}/events"
	"gno.land/r/demo/profile"
)

var event *events.Event

func init() {
	conf := events.Config{
		Creator: "{{.creatorAddr}}",
		Title: {{.title}},
		Description: {{.description}},
		StartDate: {{.req.StartDate}},
		EndDate: {{.req.EndDate}},
		Capacity: {{.req.Capacity}},
		GetProfileString: profile.GetStringField,
		ZenaoAdminAddr: "{{.zenaoAdminAddr}}",
		Location: {{.location}},
	}
	event = events.NewEvent(&conf) 

	profile.SetStringField(profile.DisplayName, {{.title}})
	profile.SetStringField(profile.Bio, {{.description}})
	profile.SetStringField(profile.Avatar, {{.imageURI}})
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

func EditEvent(title, description, imageURI string, startDate, endDate int64, capacity uint64, location string) {
	event.AssertCallerIsOrganizer()

	profile.SetStringField(profile.DisplayName, title)
	profile.SetStringField(profile.Bio, description)
	profile.SetStringField(profile.Avatar, imageURI)

	event.StartDate = startDate
	event.EndDate = endDate
	event.Capacity = capacity
	event.Location = location
}

func Render(path string) string {
	s := md.H1(profile.GetStringField(std.CurrentRealm().Addr(), profile.DisplayName, ""))
	s += md.Image("Event presentation", profile.GetStringField(std.CurrentRealm().Addr(), profile.Avatar, ""))
	s += md.Paragraph(profile.GetStringField(std.CurrentRealm().Addr(), profile.Bio, ""))
	s += md.BulletList([]string{
		ufmt.Sprintf("Location: %s", event.Location),
		ufmt.Sprintf("Time: From %s to %s", time.Unix(event.StartDate, 0).Format(time.DateTime), time.Unix(event.EndDate, 0).Format(time.DateTime)),
		ufmt.Sprintf("Capacity: %d/%d", event.CountParticipants(), event.Capacity),
		ufmt.Sprintf("Organizer: %s", profile.GetStringField(std.Address(event.Creator), profile.DisplayName, "")),
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
	"gno.land/p/{{.namespace}}/users"
	"gno.land/r/demo/profile"
)

var user *users.User

func init() {
	user = users.NewUser()

	profile.SetStringField(profile.DisplayName, "{{.displayName}}")
	profile.SetStringField(profile.Bio, "{{.bio}}")
	profile.SetStringField(profile.Avatar, "{{.avatarURI}}")
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
