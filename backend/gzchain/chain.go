package gzchain

import (
	"context"
	"crypto"
	"crypto/ed25519"
	srand "crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strconv"
	"strings"
	"text/template"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	"github.com/gnolang/gno/gnovm/stdlibs/chain"
	"github.com/gnolang/gno/gnovm/stdlibs/chain/banker"
	tm2client "github.com/gnolang/gno/tm2/pkg/bft/rpc/client"
	ctypes "github.com/gnolang/gno/tm2/pkg/bft/rpc/core/types"
	"github.com/gnolang/gno/tm2/pkg/crypto/keys"
	tm2std "github.com/gnolang/gno/tm2/pkg/std"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	"github.com/samouraiworld/zenao/backend/mapsl"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/protobuf/encoding/protojson"
)

const (
	gnoEventPollCreate = "zenao-poll-create"
	gnoEventPostCreate = "zenao-post-create"
)

func SetupChain(adminMnemonic string, namespace string, chainID string, chainEndpoint string, gasSecurityRate float64, logger *zap.Logger) (*gnoZenaoChain, error) {
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

	tracer := otel.Tracer("chain")

	return &gnoZenaoChain{
		client:                  client,
		eventsIndexPkgPath:      path.Join("gno.land/r", namespace, "eventreg"),
		communitiesIndexPkgPath: path.Join("gno.land/r", namespace, "communityreg"),
		signerInfo:              signerInfo,
		logger:                  logger,
		namespace:               namespace,
		gasSecurityRate:         gasSecurityRate,
		chainEndpoint:           chainEndpoint,
		ctx:                     context.Background(),
		tracer:                  tracer,
	}, nil
}

// TODO: remove it when we delete gentxs
func SetupChainGentxs(signerInfo keys.Info, namespace string, logger *zap.Logger) *gnoZenaoChain {
	return &gnoZenaoChain{
		eventsIndexPkgPath:      path.Join("gno.land/r", namespace, "eventreg"),
		communitiesIndexPkgPath: path.Join("gno.land/r", namespace, "communityreg"),
		signerInfo:              signerInfo,
		logger:                  logger,
		namespace:               namespace,
	}
}

type gnoZenaoChain struct {
	client                  gnoclient.Client
	eventsIndexPkgPath      string
	communitiesIndexPkgPath string
	signerInfo              keys.Info
	logger                  *zap.Logger
	namespace               string
	gasSecurityRate         float64
	chainEndpoint           string
	ctx                     context.Context
	tracer                  trace.Tracer
}

// WithContext implements zeni.Chain.
func (g *gnoZenaoChain) WithContext(ctx context.Context) zeni.Chain {
	return g.withContext(ctx)
}

func (g *gnoZenaoChain) withContext(ctx context.Context) *gnoZenaoChain {
	nc := *g
	client, err := NewTM2Client(ctx, g.chainEndpoint)
	if err != nil {
		panic(err) // XXX: do better
	}
	nc.client.RPCClient = tm2client.NewRPCClient(client)
	nc.ctx = ctx
	return &nc
}

const userDefaultAvatar = "ipfs://bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy"

// FillAdminProfile implements zeni.Chain.
func (g *gnoZenaoChain) FillAdminProfile() {
	g, span := g.trace("gzchain.FillAdminProfile")
	defer span.End()

	msg := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		Send:    banker.CompactCoins([]string{"ugnot"}, []int64{1_000_000}),
		PkgPath: "gno.land/r/gnoland/users/v1",
		Func:    "Register",
		Args:    []string{"zenaoadm4242"},
	}
	gasWanted, err := g.estimateCallTxGas(msg)
	if err != nil {
		g.logger.Error("failed to estimation transaction to book admin username", zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
	} else {
		broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
			GasFee:    "1000000ugnot",
			GasWanted: gasWanted,
		}, msg))
		if err != nil {
			g.logger.Error("failed to book admin username", zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
		} else {
			g.logger.Info("booked admin username", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
		}
	}

	kv := [][2]string{
		{"DisplayName", "Zenao Admin"},
		{"Avatar", userDefaultAvatar},
		{"Bio", "This is the root zenao admin, it is responsible for managing accounts until they become self-custodial"},
	}
	for _, field := range kv {
		msg = vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: "gno.land/r/demo/profile",
			Func:    "SetStringField",
			Args: []string{
				field[0],
				field[1],
			},
		}
		gasWanted, err := g.estimateCallTxGas(msg)
		if err != nil {
			g.logger.Error("failed to estimation transaction to set admin profile field", zap.String("name", field[0]), zap.String("value", field[1]), zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
		} else {
			broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
				GasFee:    "1000000ugnot",
				GasWanted: gasWanted,
			}, msg))
			if err != nil {
				g.logger.Error("failed to set admin profile field", zap.String("name", field[0]), zap.String("value", field[1]), zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
			} else {
				g.logger.Info("admin profile field set", zap.String("name", field[0]), zap.String("value", field[1]), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
			}
		}
	}
}

// EntityRoles implements zeni.Chain.
func (g *gnoZenaoChain) EntityRoles(entityRealmID string, orgRealmID string, orgType string) ([]string, error) {
	g, span := g.trace("gzchain.EntityRoles")
	defer span.End()

	if orgType != zeni.EntityTypeCommunity && orgType != zeni.EntityTypeEvent {
		return nil, fmt.Errorf("unsupported org type: %s", orgType)
	}

	var expr string
	if orgType == zeni.EntityTypeCommunity {
		expr = "community.GetUserRolesJSON(\"" + entityRealmID + "\")"
	}
	if orgType == zeni.EntityTypeEvent {
		expr = "event.GetUserRolesJSON(\"" + entityRealmID + "\")"
	}
	raw, err := checkQueryErr(g.client.QEval(orgRealmID, expr))
	if err != nil {
		return nil, err
	}

	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	var roles []string
	if err := json.Unmarshal([]byte(parsedRaw), &roles); err != nil {
		return nil, err
	}

	return roles, nil
}

// SignerAddress implements zeni.Chain.
func (g *gnoZenaoChain) SignerAddress() string {
	return g.signerInfo.GetAddress().String()
}

// GetUser implements zeni.Chain.
func (g *gnoZenaoChain) GetUser(userRealmID string) (displayName string, Bio string, ImageUri string, err error) {
	g, span := g.trace("gzchain.GetUser")
	defer span.End()

	// TODO: change to use the getter defined in the user realm
	addr := gnolang.DerivePkgBech32Addr(userRealmID).String()
	raw, err := checkQueryErr(g.client.QEval("gno.land/r/demo/profile", "GetStringField(\""+addr+"\", \"DisplayName\", \"\")"))
	if err != nil {
		return "", "", "", err
	}
	displayName, err = parseQEvalResponseData(raw)
	if err != nil {
		return "", "", "", err
	}
	raw, err = checkQueryErr(g.client.QEval("gno.land/r/demo/profile", "GetStringField(\""+addr+"\", \"Bio\", \"\")"))
	if err != nil {
		return "", "", "", err
	}
	Bio, err = parseQEvalResponseData(raw)
	if err != nil {
		return "", "", "", err
	}
	raw, err = checkQueryErr(g.client.QEval("gno.land/r/demo/profile", "GetStringField(\""+addr+"\", \"Avatar\", \"\")"))
	if err != nil {
		return "", "", "", err
	}
	ImageUri, err = parseQEvalResponseData(raw)
	if err != nil {
		return "", "", "", err
	}
	return displayName, Bio, ImageUri, nil
}

// CreateEvent implements ZenaoChain.
func (g *gnoZenaoChain) CreateEvent(eventRealmID string, organizersRealmIDs []string, gatekeepersRealmIDs []string, req *zenaov1.CreateEventRequest, privacy *zenaov1.EventPrivacy) error {
	g, span := g.trace("gzchain.CreateEvent")
	defer span.End()

	eventRealmSrc, err := genEventRealmSource(organizersRealmIDs, gatekeepersRealmIDs, g.signerInfo.GetAddress().String(), g.namespace, req, privacy)
	if err != nil {
		return err
	}

	g.logger.Info("creating event on chain", zap.String("pkg-path", eventRealmID))

	// TODO: single tx with all messages

	msgPkg := vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "event",
			Path: eventRealmID,
			Files: []*tm2std.MemFile{
				{Name: "event.gno", Body: eventRealmSrc},
				{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", eventRealmID)},
			},
		},
	}
	gasWanted, err := g.estimateAddPackageTxGas(msgPkg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgPkg))
	if err != nil {
		return err
	}

	g.logger.Info("created event realm", zap.String("pkg-path", eventRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "IndexEvent",
		Args: []string{
			eventRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("indexed event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// GetEvent implements ZenaoChain.
func (g *gnoZenaoChain) GetEvent(eventRealmID string) (*zenaov1.EventInfo, error) {
	g, span := g.trace("gzchain.GetEvent")
	defer span.End()

	raw, err := checkQueryErr(g.client.QEval(eventRealmID, "event.Info().ToJSON().String()"))
	if err != nil {
		return nil, err
	}
	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	var res zenaov1.EventInfo
	if err := protojson.Unmarshal([]byte(parsedRaw), &res); err != nil {
		return nil, err
	}

	return &res, nil
}

// GetEventUsersByRole implements ZenaoChain.
func (g *gnoZenaoChain) GetEventUsersByRole(eventRealmID string, role string) ([]string, error) {
	g, span := g.trace("gzchain.GetEventUsersByRole")
	defer span.End()

	raw, err := checkQueryErr(g.client.QEval(eventRealmID, "event.GetUsersWithRoleJSON(\""+role+"\")"))
	if err != nil {
		return nil, err
	}
	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	var userRealmIDs []string
	if err := json.Unmarshal([]byte(parsedRaw), &userRealmIDs); err != nil {
		return nil, err
	}

	return userRealmIDs, nil
}

// GetEventCommunity implements ZenaoChain.
func (g *gnoZenaoChain) GetEventCommunity(eventRealmID string) (*zenaov1.CommunityInfo, error) {
	g, span := g.trace("gzchain.GetEventCommunity")
	defer span.End()

	raw, err := checkQueryErr(g.client.QEval(g.communitiesIndexPkgPath, "communitiesToJSON(listCommunitiesByEvent(\""+eventRealmID+"\", 1, 0))"))
	if err != nil {
		return nil, err
	}
	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	// protojson expects a single protobuf message so i parse them into a list of raw json msg first
	var rawList []json.RawMessage
	if err := json.Unmarshal([]byte(parsedRaw), &rawList); err != nil {
		return nil, err
	}

	list := make([]*zenaov1.CommunityInfo, 0, len(rawList))
	for _, elem := range rawList {
		var info zenaov1.CommunityInfo
		if err := protojson.Unmarshal(elem, &info); err != nil {
			return nil, err
		}
		list = append(list, &info)
	}

	if len(list) == 0 {
		return nil, nil
	}
	if len(list) > 1 {
		return nil, errors.New("there is multiple communities for this event, should not happen for now")
	}

	return list[0], nil
}

// CancelEvent implements ZenaoChain.
func (g *gnoZenaoChain) CancelEvent(eventRealmID string, callerRealmID string) error {
	g, span := g.trace("gzchain.CancelEvent")
	defer span.End()

	// TODO: single tx with all messages

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCancelEventMsgRunBody(eventRealmID, callerRealmID),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}

	g.logger.Info("cancelled event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "RemoveIndex",
		Args: []string{
			eventRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("removed event from index", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditEvent implements ZenaoChain.
func (g *gnoZenaoChain) EditEvent(eventRealmID string, callerRealmID string, organizersRealmIDs []string, gatekeepersRealmIDs []string, req *zenaov1.EditEventRequest, privacy *zenaov1.EventPrivacy) error {

	g, span := g.trace("gzchain.EditEvent")
	defer span.End()

	organizersLit := stringSliceLit(organizersRealmIDs)
	gatekeepersLit := stringSliceLit(gatekeepersRealmIDs)
	loc := "&" + req.Location.GnoLiteral("zenaov1.", "\t\t")
	privacyStr := "&" + privacy.GnoLiteral("zenaov1.", "\t\t")

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	user %q
	event %q
	zenaov1 "gno.land/p/zenao/zenao/v1"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/events"
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: %q,
		Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
			Title: "Edit event",
			Action: events.NewEditEventAction(
				%s,
				%s,
				%q,
				%q,
				%q,
				%d,
				%d,
				%d,
				%t,
				%s,
				%s,
			),
		}),
	})
}
`, callerRealmID, eventRealmID, "Edit "+eventRealmID, organizersLit, gatekeepersLit, req.Title, req.Description, req.ImageUri, req.StartDate, req.EndDate, req.Capacity, req.Discoverable, loc, privacyStr),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("edited event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "UpdateIndex",
		Args: []string{
			eventRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("updated index", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// CreateUser implements ZenaoChain.
func (g *gnoZenaoChain) CreateUser(user *zeni.User) error {
	g, span := g.trace("gzchain.CreateUser")
	defer span.End()

	userRealmSrc, err := genUserRealmSource(user, g.namespace, g.signerInfo.GetAddress().String())
	if err != nil {
		return err
	}

	userPkgPath := g.userRealmPkgPath(user.ID)
	msg := vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "user",
			Path: userPkgPath,
			Files: []*tm2std.MemFile{
				{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", userPkgPath)},
				{Name: "user.gno", Body: userRealmSrc},
			},
		},
	}
	gasWanted, err := g.estimateAddPackageTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("created user realm", zap.String("pkg-path", userPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// Participate implements ZenaoChain.
func (g *gnoZenaoChain) Participate(eventRealmID, callerRealmID, participantRealmID string, ticketPubkey string, eventSK ed25519.PrivateKey) error {
	g, span := g.trace("gzchain.Participate")
	defer span.End()

	signature := ""
	if len(eventSK) != 0 {
		msg := []byte(ticketPubkey)
		sigBz, err := eventSK.Sign(srand.Reader, msg, crypto.Hash(0))
		if err != nil {
			return err
		}
		signature = base64.RawURLEncoding.EncodeToString(sigBz)
	}

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genParticipateMsgRunBody(callerRealmID, eventRealmID, participantRealmID, ticketPubkey, signature),
			}},
		},
	}
	broadcastRes, err := g.run("participate", msgRun)
	if err != nil {
		return err
	}

	g.logger.Info("added participant", zap.String("user", participantRealmID), zap.String("event", eventRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "AddParticipant",
		Args: []string{
			eventRealmID,
			participantRealmID,
		},
	}
	broadcastRes, err = g.call(msgCall)
	if err != nil {
		return err
	}

	g.logger.Info("indexed participant", zap.String("user", participantRealmID), zap.String("event", eventRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// CancelParticipation implements ZenaoChain.
func (g *gnoZenaoChain) CancelParticipation(eventRealmID, callerRealmID, participantRealmID, ticketPubkey string) error {
	g, span := g.trace("gzchain.CancelParticipation")
	defer span.End()

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCancelParticipationMsgRunBody(callerRealmID, eventRealmID, participantRealmID, ticketPubkey),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("removed participant", zap.String("user", participantRealmID), zap.String("event", eventRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "RemoveParticipant",
		Args: []string{
			eventRealmID,
			participantRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("removed index participant", zap.String("user", participantRealmID), zap.String("event", eventRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

func (g *gnoZenaoChain) Checkin(eventRealmID string, gatekeeperRealmID string, req *zenaov1.CheckinRequest) error {
	g, span := g.trace("gzchain.Checkin")
	defer span.End()

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCheckinMsgRunBody(eventRealmID, gatekeeperRealmID, req.TicketPubkey, req.Signature),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("checked in participant", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// CreateCommunity implements ZenaoChain.
func (g *gnoZenaoChain) CreateCommunity(communityRealmID string, administratorsRealmIDs []string, membersRealmIDs []string, eventsRealmIDs []string, req *zenaov1.CreateCommunityRequest) error {
	g, span := g.trace("gzchain.CreateCommunity")
	defer span.End()

	cmtRealmSrc, err := genCommunityRealmSource(administratorsRealmIDs, membersRealmIDs, eventsRealmIDs, g.signerInfo.GetAddress().String(), g.namespace, req)
	if err != nil {
		return err
	}
	g.logger.Info("creating community on chain", zap.String("pkg-path", communityRealmID))
	// TODO: single tx with all messages
	msgkg := vm.MsgAddPackage{
		Creator: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "community",
			Path: communityRealmID,
			Files: []*tm2std.MemFile{
				{Name: "community.gno", Body: cmtRealmSrc},
				{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", communityRealmID)},
			},
		},
	}
	gasWanted, err := g.estimateAddPackageTxGas(msgkg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.AddPackage(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgkg))
	if err != nil {
		return err
	}
	g.logger.Info("created community realm", zap.String("pkg-path", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.communitiesIndexPkgPath,
		Func:    "IndexCommunity",
		Args: []string{
			communityRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}
	g.logger.Info("indexed community", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	for _, memberRealmID := range membersRealmIDs {
		msgCall = vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: g.communitiesIndexPkgPath,
			Func:    "AddMember",
			Args: []string{
				communityRealmID,
				memberRealmID,
			},
		}
		gasWanted, err = g.estimateCallTxGas(msgCall)
		if err != nil {
			return err
		}
		broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
			GasFee:    "10000000ugnot",
			GasWanted: gasWanted,
		}, msgCall))
		if err != nil {
			return err
		}
		g.logger.Info("added member to community registry", zap.String("member", memberRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	}

	for _, evtRealmID := range eventsRealmIDs {
		msgCall = vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: g.communitiesIndexPkgPath,
			Func:    "AddEvent",
			Args: []string{
				communityRealmID,
				evtRealmID,
			},
		}
		gasWanted, err = g.estimateCallTxGas(msgCall)
		if err != nil {
			return err
		}
		broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
			GasFee:    "10000000ugnot",
			GasWanted: gasWanted,
		}, msgCall))
		if err != nil {
			return err
		}
		g.logger.Info("added event to community registry", zap.String("event", evtRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	}

	return nil
}

// GetCommunity implements ZenaoChain.
func (g *gnoZenaoChain) GetCommunity(communityRealmID string) (*zenaov1.CommunityInfo, error) {
	g, span := g.trace("gzchain.GetCommunity")
	defer span.End()

	raw, err := checkQueryErr(g.client.QEval(communityRealmID, "community.Info().ToJSON().String()"))
	if err != nil {
		return nil, err
	}
	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	var res zenaov1.CommunityInfo
	if err := protojson.Unmarshal([]byte(parsedRaw), &res); err != nil {
		return nil, err
	}

	return &res, nil
}

// GetCommunityUsersByRole implements ZenaoChain.
func (g *gnoZenaoChain) GetCommunityUsersByRole(communityRealmID string, role string) ([]string, error) {
	g, span := g.trace("gzchain.GetCommunityUsersByRole")
	defer span.End()

	raw, err := checkQueryErr(g.client.QEval(communityRealmID, "community.GetMembersWithRoleJSON(\""+role+"\")"))
	if err != nil {
		return nil, err
	}
	parsedRaw, err := parseQEvalResponseData(raw)
	if err != nil {
		return nil, err
	}

	var userRealmIDs []string
	if err := json.Unmarshal([]byte(parsedRaw), &userRealmIDs); err != nil {
		return nil, err
	}

	return userRealmIDs, nil
}

// EditCommunity implements ZenaoChain.
func (g *gnoZenaoChain) EditCommunity(communityRealmID string, callerRealmID string, administratorsRealmIDs []string, req *zenaov1.EditCommunityRequest) error {
	g, span := g.trace("gzchain.EditCommunity")
	defer span.End()

	adminsLit := stringSliceLit(administratorsRealmIDs)

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	user %q
	community %q
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/communities"
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: %q,
		Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
			Title: "Edit community",
			Action: communities.NewEditCommunityAction(
				%q,
				%q,
				%q,
				%q,
				%s,
			),
		}),
	})
}
`, callerRealmID, communityRealmID, "Edit "+communityRealmID, req.DisplayName, req.Description, req.AvatarUri, req.BannerUri, adminsLit),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("edited community", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	// Add new admin to registry but don't remove old one since they still are members of the community
	for _, adminRealmID := range administratorsRealmIDs {
		msgCall := vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: g.communitiesIndexPkgPath,
			Func:    "AddMember",
			Args: []string{
				communityRealmID,
				adminRealmID,
			},
		}
		gasWanted, err = g.estimateCallTxGas(msgCall)
		if err != nil {
			return err
		}
		broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
			GasFee:    "10000000ugnot",
			GasWanted: gasWanted,
		}, msgCall))
		if err != nil {
			return err
		}
		g.logger.Info("added admin to community registry", zap.String("admin", adminRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	}

	return nil
}

// AddMemberToCommunity implements ZenaoChain.
func (g *gnoZenaoChain) AddMemberToCommunity(callerRealmID string, communityRealmID string, userRealmID string) error {
	g, span := g.trace("gzchain.AddMemberToCommunity")
	defer span.End()

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCommunityAddMemberMsgRunBody(callerRealmID, communityRealmID, userRealmID),
			}},
		},
	}
	broadcastRes, err := g.run("add member to community", msgRun)
	if err != nil {
		return err
	}
	g.logger.Info("added member to community", zap.String("user", userRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.communitiesIndexPkgPath,
		Func:    "AddMember",
		Args: []string{
			communityRealmID,
			userRealmID,
		},
	}
	broadcastRes, err = g.call(msgCall)
	if err != nil {
		return err
	}
	g.logger.Info("indexed member in community", zap.String("user", userRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// AddMembersToCommunity implements ZenaoChain.
func (g *gnoZenaoChain) AddMembersToCommunity(callerRealmID string, communityRealmID string, userRealmIDs []string) error {
	g, span := g.trace("gzchain.AddMembersToCommunity")
	defer span.End()

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCommunityAddMembersMsgRunBody(callerRealmID, communityRealmID, userRealmIDs),
			}},
		},
	}
	broadcastRes, err := g.run("add members to community", msgRun)
	if err != nil {
		return err
	}
	g.logger.Info("added members to community", zap.Strings("users", userRealmIDs), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	for _, userRealmID := range userRealmIDs {
		msgCall := vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: g.communitiesIndexPkgPath,
			Func:    "AddMember",
			Args: []string{
				communityRealmID,
				userRealmID,
			},
		}
		broadcastRes, err = g.call(msgCall)
		if err != nil {
			return err
		}
	}
	g.logger.Info("indexed members in community", zap.Strings("users", userRealmIDs), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// RemoveMemberFromCommunity implements ZenaoChain.
func (g *gnoZenaoChain) RemoveMemberFromCommunity(callerRealmID string, communityRealmID string, userRealmID string) error {
	g, span := g.trace("gzchain.RemoveMemberFromCommunity")
	defer span.End()

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCommunityRemoveMemberMsgRunBody(callerRealmID, communityRealmID, userRealmID),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("removed member from community", zap.String("user", userRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.communitiesIndexPkgPath,
		Func:    "RemoveMember",
		Args: []string{
			communityRealmID,
			userRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}
	g.logger.Info("removed index member in community", zap.String("user", userRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// AddEventToCommunity implements ZenaoChain.
func (g *gnoZenaoChain) AddEventToCommunity(callerRealmID string, communityRealmID string, eventRealmID string) error {
	g, span := g.trace("gzchain.AddEventToCommunity")
	defer span.End()

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCommunityAddEventMsgRunBody(callerRealmID, communityRealmID, eventRealmID),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("added event to community", zap.String("event", eventRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.communitiesIndexPkgPath,
		Func:    "AddEvent",
		Args: []string{
			communityRealmID,
			eventRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("indexed event in community", zap.String("event", eventRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// RemoveEventFromCommunity implements ZenaoChain.
func (g *gnoZenaoChain) RemoveEventFromCommunity(callerRealmID string, communityRealmID string, eventRealmID string) error {
	g, span := g.trace("gzchain.RemoveEventFromCommunity")
	defer span.End()

	g.logger.Info("removing event from community", zap.String("event", eventRealmID), zap.String("community", communityRealmID))

	msgRun := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCommunityRemoveEventMsgRunBody(callerRealmID, communityRealmID, eventRealmID),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msgRun)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgRun))
	if err != nil {
		return err
	}
	g.logger.Info("removed event from community", zap.String("event", eventRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	msgCall := vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.communitiesIndexPkgPath,
		Func:    "RemoveEvent",
		Args: []string{
			communityRealmID,
			eventRealmID,
		},
	}
	gasWanted, err = g.estimateCallTxGas(msgCall)
	if err != nil {
		return err
	}
	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msgCall))
	if err != nil {
		return err
	}

	g.logger.Info("removed index event in community", zap.String("event", eventRealmID), zap.String("community", communityRealmID), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditUser implements ZenaoChain.
func (g *gnoZenaoChain) EditUser(userRealmID string, req *zenaov1.EditUserRequest) error {
	g, span := g.trace("gzchain.EditUser")
	defer span.End()

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	user %q
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/basedao"
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "Edit profile",
		Action: basedao.NewEditProfileAction([][2]string{
			{"DisplayName", %q},
			{"Bio", %q},
			{"Avatar", %q},
		}...),
	})
}
`, userRealmID, req.DisplayName, req.Bio, req.AvatarUri),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("edited user", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// UserRealmID implements ZenaoChain.
func (g *gnoZenaoChain) UserRealmID(userID string) string {
	return g.userRealmPkgPath(userID)
}

// EventRealmID implements ZenaoChain.
func (g *gnoZenaoChain) EventRealmID(eventID string) string {
	return g.eventRealmPkgPath(eventID)
}

// CommunityRealmID implements ZenaoChain.
func (g *gnoZenaoChain) CommunityRealmID(communityID string) string {
	return g.communityPkgPath(communityID)
}

// EntityAddress implements ZenaoChain.
func (g *gnoZenaoChain) EntityRealmID(entityType string, entityID string) (string, error) {
	switch entityType {
	case zeni.EntityTypeUser:
		return g.UserRealmID(entityID), nil
	case zeni.EntityTypeEvent:
		return g.EventRealmID(entityID), nil
	case zeni.EntityTypeCommunity:
		return g.CommunityRealmID(entityID), nil
	}
	return "", fmt.Errorf("unknown entity type: %q", entityType)
}

// FromRealmIDToID implements ZenaoChain.
func (g *gnoZenaoChain) FromRealmIDToID(realmID string, prefix string) (string, error) {
	parts := strings.Split(realmID, "/")
	// take the last part
	if len(parts) < 4 {
		return "", fmt.Errorf("invalid realm ID: %q", realmID)
	}
	idPart := parts[len(parts)-1]
	if !strings.HasPrefix(idPart, prefix) {
		return "", fmt.Errorf("invalid realm ID prefix: %q", realmID)
	}
	return strings.TrimPrefix(idPart, prefix), nil
}

// CreatePost implements ZenaoChain
func (g *gnoZenaoChain) CreatePost(userRealmID string, orgRealmID string, post *feedsv1.Post) (postID string, err error) {
	g, span := g.trace("gzchain.CreatePost")
	defer span.End()

	feedID := orgRealmID + ":main"
	gnoLitPost := "&" + post.GnoLiteral("feedsv1.", "\t\t")

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCreatePostMsgRunBody(userRealmID, feedID, gnoLitPost),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return "", err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return "", err
	}

	for _, event := range broadcastRes.DeliverTx.Events {
		switch gnoEvent := event.(type) {
		case chain.Event:
			if gnoEvent.Type == gnoEventPostCreate {
				postID, err = extractEventAttribute(gnoEvent, "postID")
				if err != nil {
					return "", err
				}
			}
		case chain.StorageDepositEvent:
		case chain.StorageUnlockEvent:
		default:
			g.logger.Info("unknown event type", zap.Any("event", event))
		}
	}

	if postID == "" {
		return "", errors.New("an empty string has been extracted for postID from tx events")
	}

	g.logger.Info("created standard post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return postID, nil
}

// EditPost implements ZenaoChain
func (g *gnoZenaoChain) EditPost(userRealmID string, postID string, post *feedsv1.Post) error {
	g, span := g.trace("gzchain.EditPost")
	defer span.End()

	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return err
	}
	gnoLitPost := "&" + post.GnoLiteral("feedsv1.", "\t\t")

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genEditPostMsgRunBody(userRealmID, gnoLitPost, postIDInt),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("edited post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// DeletePost implements ZenaoChain
func (g *gnoZenaoChain) DeletePost(userRealmID string, postID string) error {
	g, span := g.trace("gzchain.DeletePost")
	defer span.End()

	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return err
	}
	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genDeletePostMsgRunBody(userRealmID, postIDInt),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("deleted post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// ReactPost implements ZenaoChain
func (g *gnoZenaoChain) ReactPost(userRealmID string, req *zenaov1.ReactPostRequest) error {
	g, span := g.trace("gzchain.ReactPost")
	defer span.End()

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genReactPostMsgRunBody(userRealmID, req.PostId, req.Icon),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("reacted to a post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// CreatePoll implements ZenaoChain
func (g *gnoZenaoChain) CreatePoll(userRealmID string, orgRealmID string, req *zenaov1.CreatePollRequest) (pollID, postID string, err error) {
	g, span := g.trace("gzchain.CreatePoll")
	defer span.End()

	feedID := orgRealmID + ":main"
	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genCreatePollMsgRunBody(orgRealmID, userRealmID, feedID, req.Question, req.Options, req.Kind, req.Duration),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return "", "", err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return "", "", err
	}

	for _, event := range broadcastRes.DeliverTx.Events {
		switch gnoEvent := event.(type) {
		case chain.Event:
			if gnoEvent.Type == gnoEventPollCreate {
				pollID, err = extractEventAttribute(gnoEvent, "pollID")
				if err != nil {
					return "", "", err
				}
			}
			if gnoEvent.Type == gnoEventPostCreate {
				postID, err = extractEventAttribute(gnoEvent, "postID")
				if err != nil {
					return "", "", err
				}
			}
		case chain.StorageDepositEvent:
		case chain.StorageUnlockEvent:
		default:
			g.logger.Info("unknown event type", zap.Any("event", event))
		}
	}

	if pollID == "" {
		return "", "", errors.New("an empty string has been extracted for pollID from tx events")
	}
	if postID == "" {
		return "", "", errors.New("an empty string has been extracted for postID from tx events")
	}

	g.logger.Info("created poll", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return pollID, postID, nil
}

func (g *gnoZenaoChain) VotePoll(userRealmID string, req *zenaov1.VotePollRequest) error {
	g, span := g.trace("gzchain.VotePoll")
	defer span.End()

	msg := vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &tm2std.MemPackage{
			Name: "main",
			Files: []*tm2std.MemFile{{
				Name: "main.gno",
				Body: genVotePollMsgRunBody(userRealmID, req.PollId, req.Option),
			}},
		},
	}
	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return err
	}
	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: gasWanted,
	}, msg))
	if err != nil {
		return err
	}

	g.logger.Info("voted on poll", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

func (g *gnoZenaoChain) eventRealmPkgPath(eventID string) string {
	return fmt.Sprintf("gno.land/r/%s/events/e%s", g.namespace, eventID)
}

func (g *gnoZenaoChain) communityPkgPath(communityID string) string {
	return fmt.Sprintf("gno.land/r/%s/communities/c%s", g.namespace, communityID)
}

func (g *gnoZenaoChain) orgPkgPath(orgType string, orgID string) string {
	if orgType == zeni.EntityTypeEvent {
		return g.eventRealmPkgPath(orgID)
	} else if orgType == zeni.EntityTypeCommunity {
		return g.communityPkgPath(orgID)
	}
	return ""
}

func (g *gnoZenaoChain) userRealmPkgPath(userID string) string {
	return fmt.Sprintf("gno.land/r/%s/users/u%s", g.namespace, userID)
}

var _ zeni.Chain = (*gnoZenaoChain)(nil)

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

func parseQEvalResponseData(raw string) (string, error) {
	if len(raw) < 10 || raw[0] != '(' {
		return "", fmt.Errorf("unexpected format: %s", raw)
	}
	inner := raw[1 : len(raw)-len(" string)")]

	var innerStr string
	if err := json.Unmarshal([]byte(inner), &innerStr); err != nil {
		return "", fmt.Errorf("first unmarshal failed: %w", err)
	}
	return innerStr, nil
}

func checkQueryErr(data string, queryRes *ctypes.ResultABCIQuery, baseErr error) (string, error) {
	if baseErr != nil {
		return "", baseErr
	}
	if queryRes.Response.Error != nil {
		return "", fmt.Errorf("%w\n%s", queryRes.Response.Error, queryRes.Response.Log)
	}
	return data, nil
}

func (g *gnoZenaoChain) trace(label string) (*gnoZenaoChain, trace.Span) {
	ctx, span := g.tracer.Start(
		g.ctx,
		label,
		trace.WithSpanKind(trace.SpanKindClient),
	)
	return g.withContext(ctx), span
}

func (g *gnoZenaoChain) call(msg vm.MsgCall) (*ctypes.ResultBroadcastTxCommit, error) {
	g, span := g.trace(fmt.Sprintf("call %s.%s", msg.PkgPath, msg.Func))
	defer span.End()

	gasWanted, err := g.estimateCallTxGas(msg)
	if err != nil {
		return nil, err
	}

	return checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msg))
}

func (g *gnoZenaoChain) estimateCallTxGas(msgs ...vm.MsgCall) (int64, error) {
	g, span := g.trace("estimate call tx gas")
	defer span.End()

	cfg := gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 300000000,
	}
	tx, err := gnoclient.NewCallTx(cfg, msgs...)
	if err != nil {
		return 0, err
	}
	tx, err = g.client.SignTx(*tx, 0, 0)
	if err != nil {
		return 0, err
	}
	gasWanted, err := g.client.EstimateGas(tx)
	if err != nil {
		return 0, err
	}
	return int64(float64(gasWanted) + float64(gasWanted)*g.gasSecurityRate), nil
}

func (g *gnoZenaoChain) run(label string, msg vm.MsgRun) (*ctypes.ResultBroadcastTxCommit, error) {
	g, span := g.trace(fmt.Sprintf("run %s", label))
	defer span.End()

	gasWanted, err := g.estimateRunTxGas(msg)
	if err != nil {
		return nil, err
	}

	return checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: gasWanted,
	}, msg))
}

func (g *gnoZenaoChain) estimateRunTxGas(msgs ...vm.MsgRun) (int64, error) {
	g, span := g.trace("estimate run tx gas")
	defer span.End()

	cfg := gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 300000000,
	}
	tx, err := gnoclient.NewRunTx(cfg, msgs...)
	if err != nil {
		return 0, err
	}
	tx, err = g.client.SignTx(*tx, 0, 0)
	if err != nil {
		return 0, err
	}
	gasWanted, err := g.client.EstimateGas(tx)
	if err != nil {
		return 0, err
	}
	return int64(float64(gasWanted) + float64(gasWanted)*g.gasSecurityRate), nil
}

func (g *gnoZenaoChain) estimateAddPackageTxGas(msgs ...vm.MsgAddPackage) (int64, error) {
	cfg := gnoclient.BaseTxCfg{
		GasFee:    "10000000ugnot",
		GasWanted: 300000000,
	}
	tx, err := gnoclient.NewAddPackageTx(cfg, msgs...)
	if err != nil {
		return 0, err
	}
	tx, err = g.client.SignTx(*tx, 0, 0)
	if err != nil {
		return 0, err
	}
	gasWanted, err := g.client.EstimateGas(tx)
	if err != nil {
		return 0, err
	}
	return int64(float64(gasWanted) + float64(gasWanted)*g.gasSecurityRate), nil
}

func genCancelEventMsgRunBody(eventPkgPath, organizerPkgPath string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		event %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/events"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Cancel event",
			Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
				Title: "Cancel event",
				Action: events.NewCancelEventAction(),
			}),
		})
	}
`, organizerPkgPath, eventPkgPath)
}

func genCreatePostMsgRunBody(userRealmPkgPath, feedID, gnoLitPost string) string {
	return fmt.Sprintf(`package main

	import (
		"chain"

		"gno.land/p/zenao/daokit"
		"gno.land/p/nt/ufmt"
		feedsv1 "gno.land/p/zenao/feeds/v1"
		"gno.land/r/zenao/social_feed"
		user %q
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Add new post",
			Action: daokit.NewExecuteLambdaAction(newPost),
		})
	}

	func newPost() {
		feedID := %q
		post := %s

		postID := social_feed.NewPost(cross, feedID, post)
		chain.Emit(%q, "postID", ufmt.Sprintf("%%d", postID))
	}
`, userRealmPkgPath, feedID, gnoLitPost, gnoEventPostCreate)
}

func genEditPostMsgRunBody(userRealmPkgPath, gnoLitPost string, postIDint uint64) string {
	return fmt.Sprintf(`package main

	import (
		"gno.land/p/zenao/daokit"
		feedsv1 "gno.land/p/zenao/feeds/v1"
		"gno.land/r/zenao/social_feed"
		user %q
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Edit post #%d",
			Action: daokit.NewExecuteLambdaAction(editPost),
		})
	}

	func editPost() {
		postID := %d
		post := %s

		social_feed.EditPost(cross, uint64(postID), post)
	}
`, userRealmPkgPath, postIDint, postIDint, gnoLitPost)
}

func genDeletePostMsgRunBody(userRealmPkgPath string, postIDInt uint64) string {
	return fmt.Sprintf(`package main

	import (
		"gno.land/p/zenao/daokit"
		"gno.land/r/zenao/social_feed"
		user %q
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Delete post #%d",
			Action: daokit.NewExecuteLambdaAction(deletePost),
		})
	}

	func deletePost() {
		postID := uint64(%d)
		social_feed.DeletePost(cross, postID)
	}
`, userRealmPkgPath, postIDInt, postIDInt)
}

func genReactPostMsgRunBody(userRealmID, postID, icon string) string {
	return fmt.Sprintf(`package main
import (
	"gno.land/p/zenao/daokit"
	"gno.land/r/zenao/social_feed"
	user %q
)
	
func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "User %s reacts to post #%s",
		Action: daokit.NewExecuteLambdaAction(newReaction),
	})
}

func newReaction() {
	social_feed.ReactPost(cross, %s, %q)
}
`, userRealmID, userRealmID, postID, postID, icon)
}

func genVotePollMsgRunBody(userRealmPkgPath, pollID, option string) string {
	return fmt.Sprintf(`package main
				
	import (
		"gno.land/p/zenao/daokit"
		"gno.land/r/zenao/polls"
		user %q
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Vote on poll",
			Action: daokit.NewExecuteLambdaAction(voteOnPoll),
		})
	}

	func voteOnPoll() {
		pollID := %s
		option := %q
		polls.Vote(cross, uint64(pollID), option)
	}
`, userRealmPkgPath, pollID, option)
}

func genCreatePollMsgRunBody(orgPkgPath, userRealmPkgPath, feedID string, question string, options []string, kind pollsv1.PollKind, duration int64) string {
	return fmt.Sprintf(`package main

	import (
		"chain"
	
		"gno.land/p/nt/ufmt"
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/basedao"
		feedsv1 "gno.land/p/zenao/feeds/v1"
		pollsv1 "gno.land/p/zenao/polls/v1"
		org %q
		"gno.land/r/zenao/polls"
		"gno.land/r/zenao/social_feed"
		user %q
		ma "gno.land/p/zenao/multiaddr"
		"gno.land/p/zenao/realmid"
	)
	
	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: "Add new poll",
			Action: daokit.NewExecuteLambdaAction(newPoll),
		})
	}
	
	func newPoll() {
		question := %q
		options := %s
		kind := pollsv1.PollKind(%d)
		authFn := func() (string, bool) {
			caller := realmid.Previous() // XXX: this should be upgradable
			return caller, basedao.MustGetMembersViewExtension(org.DAO).IsMember(caller)
		}
		p := polls.NewPoll(cross, question, kind, %d, options, authFn)
		ma, err := ma.NewMultiaddr(social_feed.Protocols, ufmt.Sprintf("/poll/%%d/gno/gno.land/r/zenao/polls", uint64(p.ID)))
		if err != nil {
			panic("multiaddr validation failed")
		}
		chain.Emit(%q, "pollID", ufmt.Sprintf("%%d", uint64(p.ID)))
	
		feedID := %q
		post := &feedsv1.Post{
			Loc:  nil,
			Tags: []string{"poll"},
			Post: &feedsv1.LinkPost{
				Uri: ma.String(),
			},
		}
	
		postID := social_feed.NewPost(cross, feedID, post)
		chain.Emit(%q, "postID", ufmt.Sprintf("%%d", postID))
	}
	`, orgPkgPath, userRealmPkgPath, question, stringSliceLit(options), kind, duration, gnoEventPollCreate, feedID, gnoEventPostCreate)
}
func genCheckinMsgRunBody(eventPkgPath, gatekeeperPkgPath, ticketPubkey, signature string) string {
	return fmt.Sprintf(`package main
				
	import (
		event %q
		gatekeeper %q
		
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/events"
	)
	
	func main() {
		daokit.InstantExecute(gatekeeper.DAO, daokit.ProposalRequest{
			Title: "Checkin",
			Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
				Title: "Checkin",
				Action: events.NewCheckinAction(%q, %q),
			}),
		})
	}
	`, eventPkgPath, gatekeeperPkgPath, ticketPubkey, signature)
}

func genParticipateMsgRunBody(callerPkgPath, eventPkgPath, participant, ticketPubkey, signature string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		event %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/events"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
				Title: "Add participant",
				Action: events.NewAddParticipantAction(%q, %q, %q),
			}),
		})
	}
`, callerPkgPath, eventPkgPath, "Add participant in "+eventPkgPath, participant, ticketPubkey, signature)
}

func genCancelParticipationMsgRunBody(callerPkgPath, eventPkgPath, participant, ticketPubkey string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		event %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/events"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
				Title: "Remove participant",
				Action: events.NewRemoveParticipantAction(%q, %q),
			}),
		})
	}
`, callerPkgPath, eventPkgPath, "Remove participant in "+eventPkgPath, participant, ticketPubkey)
}

func genEventRemoveGatekeeperMsgRunBody(callerPkgPath, eventPkgPath, gatekeeper string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		event %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/events"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(event.DAO, daokit.ProposalRequest{
				Title: "Remove gatekeeper",
				Action: events.NewRemoveGatekeeperAction(%q),
			}),
		})
	}
`, callerPkgPath, eventPkgPath, "Remove gatekeeper in "+eventPkgPath, gatekeeper)
}

func genCommunityRemoveMemberMsgRunBody(callerPkgPath, communityPkgPath, member string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		community %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/communities"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
				Title: "Remove member",
				Action: communities.NewRemoveMemberAction(%q),
			}),
		})
	}
`, callerPkgPath, communityPkgPath, "Remove member role from: "+member+" within "+communityPkgPath, member)
}

func genCommunityAddMemberMsgRunBody(callerPkgPath, communityPkgPath, member string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		community %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/communities"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
				Title: "Add Member",
				Action: communities.NewAddMemberAction(%q),
			}),
		})
	}
`, callerPkgPath, communityPkgPath, "Add member in community "+communityPkgPath, member)
}

func genCommunityAddMembersMsgRunBody(callerPkgPath, communityPkgPath string, members []string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		community %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/communities"
	)
		
	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
				Title: "Add Members",
				Action: communities.NewAddMembersAction(%s),
			}),
		})
	}
`, callerPkgPath, communityPkgPath, "Add members in community "+communityPkgPath, stringSliceLit(members))
}

func genCommunityAddEventMsgRunBody(callerPkgPath, communityPkgPath, event string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		community %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/communities"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
				Title: "Add event",
				Action: communities.NewAddEventAction(%q),
			}),
		})
	}
`, callerPkgPath, communityPkgPath, "Add event role in "+communityPkgPath, event)
}

func genCommunityRemoveEventMsgRunBody(callerPkgPath, communityPkgPath, event string) string {
	return fmt.Sprintf(`package main

	import (
		user %q
		community %q
		"gno.land/p/zenao/daokit"
		"gno.land/p/zenao/communities"
	)

	func main() {
		daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
			Title: %q,
			Action: daokit.NewInstantExecuteAction(community.DAO, daokit.ProposalRequest{
				Title: "Remove event",
				Action: communities.NewRemoveEventAction(%q),
			}),
		})
	}
`, callerPkgPath, communityPkgPath, "Remove event role from: "+event+" within "+communityPkgPath, event)
}

func genEventRealmSource(organizers []string, gatekeepers []string, zenaoAdminAddr string, gnoNamespace string, req *zenaov1.CreateEventRequest, privacy *zenaov1.EventPrivacy) (string, error) {
	m := map[string]any{
		"organizers":     stringSliceLit(organizers),
		"gatekeepers":    stringSliceLit(gatekeepers),
		"req":            req,
		"zenaoAdminAddr": zenaoAdminAddr,
		"namespace":      gnoNamespace,
		"location":       "&" + req.Location.GnoLiteral("zenaov1.", "\t\t"),
	}

	participationPubkey := ""
	if guarded := privacy.GetGuarded(); guarded != nil {
		participationPubkey = guarded.GetParticipationPubkey()
	}

	toMarshal := map[string]any{
		"title":               req.Title,
		"description":         req.Description,
		"imageURI":            req.ImageUri,
		"participationPubkey": participationPubkey,
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

const eventRealmSourceTemplate = `package event

import (
	zenaov1 "gno.land/p/{{.namespace}}/zenao/v1"
	"gno.land/p/{{.namespace}}/events"
	"gno.land/p/{{.namespace}}/basedao"
	"gno.land/p/{{.namespace}}/daokit"
	"gno.land/p/{{.namespace}}/daocond"
	"gno.land/r/demo/profile"
	"gno.land/r/{{.namespace}}/eventreg"
	"gno.land/r/{{.namespace}}/social_feed"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	event  *events.Event // XXX: needed for backward compatibility with frontend queries
	feedId string        // XXX: workaround for "unexpected zero object id" issue
)

func init() {
	// XXX: workaround for "unexpected zero object id" issue
	feedId = social_feed.NewFeed(cross, "main", false, feedAuth)
}

func init() {
	conf := events.Config{
		Organizers: {{.organizers}},
		Gatekeepers: {{.gatekeepers}},
		Title: {{.title}},
		Description: {{.description}},
		ImageURI: {{.imageURI}},
		StartDate: {{.req.StartDate}},
		EndDate: {{.req.EndDate}},
		Capacity: {{.req.Capacity}},
		Discoverable: {{.req.Discoverable}},
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr: "{{.zenaoAdminAddr}}",
		Location: {{.location}},
		ParticipationPubkey: {{.participationPubkey}},
		CrossFn: crossFn,
		SetImplemFn: setImplem,
		FeedId: feedId,
		PrivateVarName: "event",
	}
	event = events.NewEvent(&conf)
	eventreg.Register(cross, func() *zenaov1.EventInfo { return event.Info() })
}

func Vote(_ realm, proposalID uint64, vote daocond.Vote) {
	localDAO.Vote(proposalID, vote)
}

func Execute(_ realm, proposalID uint64) {
	localDAO.Execute(proposalID)
}

func Render(path string) string {
	return localDAO.Render(path)
}

func feedAuth() (string, bool) {
	caller := event.DAOPrivate.CallerID() // XXX: this should be upgradable
	return caller, basedao.MustGetMembersViewExtension(localDAO).IsMember(caller)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
`

func genCommunityRealmSource(admins []string, members []string, events []string, zenaoAdminAddr string, gnoNamespace string, req *zenaov1.CreateCommunityRequest) (string, error) {
	m := map[string]string{
		"admins":         stringSliceLit(admins),
		"members":        stringSliceLit(members),
		"events":         stringSliceLit(events),
		"displayName":    strconv.Quote(req.DisplayName),
		"description":    strconv.Quote(req.Description),
		"avatarURI":      strconv.Quote(req.AvatarUri),
		"bannerURI":      strconv.Quote(req.BannerUri),
		"namespace":      gnoNamespace,
		"zenaoAdminAddr": strconv.Quote(zenaoAdminAddr),
	}

	t := template.Must(template.New("").Parse(communityRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

const communityRealmSourceTemplate = `package community

import (
	zenaov1 "gno.land/p/{{.namespace}}/zenao/v1"
	"gno.land/p/{{.namespace}}/communities"
	"gno.land/p/{{.namespace}}/basedao"
	"gno.land/p/{{.namespace}}/daokit"
	"gno.land/p/{{.namespace}}/daocond"
	"gno.land/r/demo/profile"
	"gno.land/r/{{.namespace}}/communityreg"
	"gno.land/r/{{.namespace}}/social_feed"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	community *communities.Community // XXX: needed for backward compatibility with frontend queries
	feedId    string                 // XXX: workaround for "unexpected zero object id" issue
)

func init() {
	// XXX: workaround for "unexpected zero object id" issue
	feedId = social_feed.NewFeed(cross, "main", false, feedAuth)
}

func init() {
	conf := communities.Config{
		ZenaoAdminAddr:   {{.zenaoAdminAddr}},
		Administrators:   {{.admins}},
		Members:          {{.members}},
		Events:           {{.events}},
		DisplayName:      {{.displayName}},
		Description:      {{.description}},
		AvatarURI:        {{.avatarURI}},
		BannerURI:        {{.bannerURI}},
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		CrossFn: crossFn,
		SetImplemFn: setImplem,
		FeedId: feedId,
		PrivateVarName: "community",
	}
	community = communities.NewCommunity(&conf)
	communityreg.Register(cross, func() *zenaov1.CommunityInfo { return community.Info() })
}

func Vote(_ realm, proposalID uint64, vote daocond.Vote) {
	localDAO.Vote(proposalID, vote)
}

func Execute(_ realm, proposalID uint64) {
	localDAO.Execute(proposalID)
}

func Render(path string) string {
	return localDAO.Render(path)
}

func feedAuth() (string, bool) {
	caller := community.DAOPrivate.CallerID() // XXX: this should be upgradable
	return caller, basedao.MustGetMembersViewExtension(localDAO).IsMember(caller)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
`

func genUserRealmSource(user *zeni.User, gnoNamespace string, zenaoAdminAddr string) (string, error) {
	displayName := user.DisplayName
	if displayName == "" {
		displayName = fmt.Sprintf("Zenao user #%s", user.ID)
	}

	bio := user.Bio
	if bio == "" {
		bio = "Zenao managed user"
	}

	avatarURI := user.AvatarURI
	if avatarURI == "" {
		avatarURI = userDefaultAvatar
	}

	m := map[string]string{
		"displayName":    strconv.Quote(displayName),
		"bio":            strconv.Quote(bio),
		"avatarURI":      strconv.Quote(avatarURI),
		"namespace":      gnoNamespace,
		"zenaoAdminAddr": strconv.Quote(zenaoAdminAddr),
	}

	t := template.Must(template.New("").Parse(userRealmSourceTemplate))
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

const userRealmSourceTemplate = `package user

import (
	"gno.land/p/{{.namespace}}/users"
	"gno.land/r/demo/profile"
	"gno.land/p/{{.namespace}}/daokit"
	"gno.land/p/{{.namespace}}/daocond"
)

var (
	DAO      daokit.DAO
	localDAO daokit.DAO

	user *users.User // XXX: needed for backward compatibility with frontend queries
)

func init() {
	user = users.NewUser(&users.Config{
		Name: {{.displayName}},
		Bio: {{.bio}},
		AvatarURI: {{.avatarURI}},
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr: {{.zenaoAdminAddr}},
		CrossFn: crossFn,
		SetImplemFn: setImplem,
		PrivateVarName: "user",
	})
}

func Vote(_ realm, proposalID uint64, vote daocond.Vote) {
	localDAO.Vote(proposalID, vote)
}

func Execute(_ realm, proposalID uint64) {
	localDAO.Execute(proposalID)
}

func Render(path string) string {
	return localDAO.Render(path)
}

func crossFn(_ realm, cb func()) {
	cb()
}

func setImplem(newLocalDAO daokit.DAO, newDAO daokit.DAO) {
	localDAO, DAO = newLocalDAO, newDAO
}
`

func extractEventAttribute(event chain.Event, key string) (string, error) {
	for _, attr := range event.Attributes {
		if attr.Key == key {
			return attr.Value, nil
		}
	}
	return "", fmt.Errorf("event %s attribute %s not found", event.Type, key)
}

func stringSliceLit(s []string) string {
	quoted := mapsl.Map(s, strconv.Quote)
	return fmt.Sprintf(`[]string{%s}`, strings.Join(quoted, `, `))
}
