package main

import (
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
	"github.com/gnolang/gno/gnovm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	"github.com/gnolang/gno/gnovm/stdlibs/std"
	tm2client "github.com/gnolang/gno/tm2/pkg/bft/rpc/client"
	ctypes "github.com/gnolang/gno/tm2/pkg/bft/rpc/core/types"
	"github.com/gnolang/gno/tm2/pkg/crypto/keys"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

const (
	gnoEventPollCreate = "zenao-poll-create"
	gnoEventPostCreate = "zenao-post-create"
)

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
		eventsIndexPkgPath: path.Join("gno.land/r", namespace, "eventreg"),
		signerInfo:         signerInfo,
		logger:             logger,
		namespace:          namespace,
	}, nil
}

type gnoZenaoChain struct {
	client             gnoclient.Client
	eventsIndexPkgPath string
	signerInfo         keys.Info
	logger             *zap.Logger
	namespace          string
}

const userDefaultAvatar = "ipfs://bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy"

// FillAdminProfile implements zeni.Chain.
func (g *gnoZenaoChain) FillAdminProfile() {
	var minFee int64 = 20 * 1_000_000
	if broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		Send:    std.CompactCoins([]string{"ugnot"}, []int64{minFee}),
		PkgPath: "gno.land/r/demo/users",
		Func:    "Register",
		Args: []string{
			"",
			"zenaoadm",
			"",
		},
	})); err != nil {
		g.logger.Error("failed to book admin username", zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
	} else {
		g.logger.Info("booked admin username", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	}

	kv := [][2]string{
		{"DisplayName", "Zenao Admin"},
		{"Avatar", userDefaultAvatar},
		{"Bio", "This is the root zenao admin, it is responsible for managing accounts until they become self-custodial"},
	}
	for _, field := range kv {
		if broadcastRes, err := checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
			GasFee:    "1000000ugnot",
			GasWanted: 10000000,
		}, vm.MsgCall{
			Caller:  g.signerInfo.GetAddress(),
			PkgPath: "gno.land/r/demo/profile",
			Func:    "SetStringField",
			Args: []string{
				field[0],
				field[1],
			},
		})); err != nil {
			g.logger.Error("failed to set admin profile field", zap.String("name", field[0]), zap.String("value", field[1]), zap.Error(err), zap.String("admin-addr", g.signerInfo.GetAddress().String()))
		} else {
			g.logger.Info("admin profile field set", zap.String("name", field[0]), zap.String("value", field[1]), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
		}
	}
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
		Func:    "IndexEvent",
		Args: []string{
			eventPkgPath,
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("indexed event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditEvent implements ZenaoChain.
func (g *gnoZenaoChain) EditEvent(evtID string, callerID string, req *zenaov1.EditEventRequest) error {
	eventPkgPath := g.eventRealmPkgPath(evtID)
	userRealmPkgPath := g.userRealmPkgPath(callerID)
	loc := "&" + req.Location.GnoLiteral("zenaov1.", "\t\t")

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
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
		Message: daokit.NewInstantExecuteMsg(event.DAO, daokit.ProposalRequest{
			Title: "Edit event",
			Message: events.NewEditEventMsg(
				%q,
				%q,
				%q,
				%d,
				%d,
				%d,
				%s,
			),
		}),
	})
}
`, userRealmPkgPath, eventPkgPath, "Edit "+eventPkgPath, req.Title, req.Description, req.ImageUri, req.StartDate, req.EndDate, req.Capacity, loc),
			}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("edited event", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "UpdateIndex",
		Args: []string{
			eventPkgPath,
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("updated index", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// CreateUser implements ZenaoChain.
func (g *gnoZenaoChain) CreateUser(user *zeni.User) error {
	userRealmSrc, err := generateUserRealmSource(user, g.namespace, g.signerInfo.GetAddress().String())
	if err != nil {
		return err
	}

	userPkgPath := g.userRealmPkgPath(user.ID)

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
func (g *gnoZenaoChain) Participate(eventID, callerID, participantID string, ticketPubkey string) error {
	eventPkgPath := g.eventRealmPkgPath(eventID)
	callerPkgPath := g.userRealmPkgPath(callerID)
	participantPkgPath := g.userRealmPkgPath(participantID)
	participantAddr := gnolang.DerivePkgAddr(participantPkgPath).String()

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	user %q
	event %q
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/events"
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: %q,
		Message: daokit.NewInstantExecuteMsg(event.DAO, daokit.ProposalRequest{
			Title: "Add participant",
			Message: events.NewAddParticipantMsg(%q, %q),
		}),
	})
}
`, callerPkgPath, eventPkgPath, "Add participant in "+eventPkgPath, participantAddr, ticketPubkey)}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("added participant", zap.String("user", participantPkgPath), zap.String("event", eventPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	broadcastRes, err = checkBroadcastErr(g.client.Call(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 10000000,
	}, vm.MsgCall{
		Caller:  g.signerInfo.GetAddress(),
		PkgPath: g.eventsIndexPkgPath,
		Func:    "AddParticipant",
		Args: []string{
			eventPkgPath,
			participantAddr,
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("indexed participant", zap.String("user", participantPkgPath), zap.String("event", eventPkgPath), zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))

	return nil
}

// EditUser implements ZenaoChain.
func (g *gnoZenaoChain) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	userRealmPkgPath := g.userRealmPkgPath(userID)

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
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
		Message: basedao.NewEditProfileMsg([][2]string{
			{"DisplayName", %q},
			{"Bio", %q},
			{"Avatar", %q},
		}...),
	})
}
`, userRealmPkgPath, req.DisplayName, req.Bio, req.AvatarUri),
			}},
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

// CreatePost implements ZenaoChain
func (g *gnoZenaoChain) CreatePost(userID string, eventID string, post *feedsv1.Post) (postID string, err error) {
	userRealmPkgPath := g.userRealmPkgPath(userID)
	eventPkgPath := g.eventRealmPkgPath(eventID)
	feedID := gnolang.DerivePkgAddr(eventPkgPath).String() + ":main"
	gnoLitPost := "&" + post.GnoLiteral("feedsv1.", "\t\t")

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	"std"

	"gno.land/p/zenao/daokit"
	"gno.land/p/demo/ufmt"
	feedsv1 "gno.land/p/zenao/feeds/v1"
	"gno.land/r/zenao/social_feed"
	user %q
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "Add new post",
		Message: daokit.NewExecuteLambdaMsg(newPost),
	})
}

func newPost() {
	feedID := %q
	post := %s

	postID := social_feed.NewPost(feedID, post)
	std.Emit(%q, "postID", ufmt.Sprintf("%%d", postID))
}
`, userRealmPkgPath, feedID, gnoLitPost, gnoEventPostCreate),
			}},
		},
	}))
	if err != nil {
		return "", err
	}

	for _, event := range broadcastRes.DeliverTx.Events {
		if gnoEvent, ok := event.(std.GnoEvent); ok {
			if gnoEvent.Type == gnoEventPostCreate {
				postID, err = extractEventAttribute(gnoEvent, "postID")
				if err != nil {
					return "", err
				}
			}
		} else {
			g.logger.Info("unknown event type", zap.Any("event", event))
		}
	}

	if postID == "" {
		return "", errors.New("an empty string has been extracted for postID from tx events")
	}

	g.logger.Info("created standard post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return postID, nil
}

// ReactPost implements ZenaoChain
func (g *gnoZenaoChain) ReactPost(userID string, eventID string, req *zenaov1.ReactPostRequest) error {
	userRealmPkgPath := g.userRealmPkgPath(userID)
	postIDInt, err := strconv.ParseUint(req.PostId, 10, 64)
	if err != nil {
		return err
	}

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
import (
	"gno.land/p/zenao/daokit"
	"gno.land/r/zenao/social_feed"
	user %q
)
	
func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "User #%s reacts to post #%d in event #%s.",
		Message: daokit.NewExecuteLambdaMsg(newReaction),
	})
}

func newReaction() {
	social_feed.ReactPost(%d, %q)
}
`, userRealmPkgPath, userID, postIDInt, eventID, postIDInt, req.Icon),
			}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("reacted to a post", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

// CreatePoll implements ZenaoChain
func (g *gnoZenaoChain) CreatePoll(userID string, req *zenaov1.CreatePollRequest) (pollID, postID string, err error) {
	userRealmPkgPath := g.userRealmPkgPath(userID)
	eventPkgPath := g.eventRealmPkgPath(req.EventId)
	feedID := gnolang.DerivePkgAddr(eventPkgPath).String() + ":main"

	options := ""
	for _, option := range req.Options {
		options += fmt.Sprintf(`%q, `, option)
	}

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main

import (
	"std"

	"gno.land/p/demo/ufmt"
	"gno.land/p/zenao/daokit"
	feedsv1 "gno.land/p/zenao/feeds/v1"
	pollsv1 "gno.land/p/zenao/polls/v1"
	event %q
	"gno.land/r/zenao/polls"
	"gno.land/r/zenao/social_feed"
	user %q
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "Add new poll",
		Message: daokit.NewExecuteLambdaMsg(newPoll),
	})
}

func newPoll() {
	question := %q
	options := []string{%s}
	kind := pollsv1.PollKind(%d)
	p := polls.NewPoll(question, kind, %d, options, event.IsMember)
	uri := ufmt.Sprintf("/poll/%%d/gno/gno.land/r/zenao/polls", uint64(p.ID))
	std.Emit(%q, "pollID", ufmt.Sprintf("%%d", uint64(p.ID)))

	feedID := %q
	post := &feedsv1.Post{
		Loc:  nil,
		Tags: []string{"poll"},
		Post: &feedsv1.LinkPost{
			Uri: uri,
		},
	}

	postID := social_feed.NewPost(feedID, post)
	std.Emit(%q, "postID", ufmt.Sprintf("%%d", postID))
}
`, eventPkgPath, userRealmPkgPath, req.Question, options, req.Kind, req.Duration, gnoEventPollCreate, feedID, gnoEventPostCreate),
			}},
		},
	}))
	if err != nil {
		return "", "", err
	}

	for _, event := range broadcastRes.DeliverTx.Events {
		if gnoEvent, ok := event.(std.GnoEvent); ok {
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
		} else {
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

func (g *gnoZenaoChain) VotePoll(userID string, req *zenaov1.VotePollRequest) error {
	userRealmPkgPath := g.userRealmPkgPath(userID)

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
				
import (
	"gno.land/p/zenao/daokit"
	"gno.land/r/zenao/polls"
	user %q
)

func main() {
	daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
		Title: "Vote on poll",
		Message: daokit.NewExecuteLambdaMsg(voteOnPoll),
	})
}

func voteOnPoll() {
	pollID := %s
	option := %q
	polls.Vote(uint64(pollID), option)
}
`, userRealmPkgPath, req.PollId, req.Option),
			}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("voted on poll", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

func (g *gnoZenaoChain) Checkin(eventID string, gatekeeperID string, req *zenaov1.CheckinRequest) error {
	eventPkgPath := g.eventRealmPkgPath(eventID)
	gatekeeperPkgPath := g.userRealmPkgPath(gatekeeperID)

	broadcastRes, err := checkBroadcastErr(g.client.Run(gnoclient.BaseTxCfg{
		GasFee:    "1000000ugnot",
		GasWanted: 100000000,
	}, vm.MsgRun{
		Caller: g.signerInfo.GetAddress(),
		Package: &gnovm.MemPackage{
			Name: "main",
			Files: []*gnovm.MemFile{{
				Name: "main.gno",
				Body: fmt.Sprintf(`package main
				
import (
	event %q
	gatekeeper %q
	
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/events"
)

func main() {
	daokit.InstantExecute(gatekeeper.DAO, daokit.ProposalRequest{
		Title: "Checkin",
		Message: daokit.NewInstantExecuteMsg(event.DAO, daokit.ProposalRequest{
			Title: "Checkin",
			Message: events.NewCheckinMsg(%q, %q),
		}),
	})
}
`, eventPkgPath, gatekeeperPkgPath, req.TicketPubkey, req.Signature),
			}},
		},
	}))
	if err != nil {
		return err
	}

	g.logger.Info("checked in participant", zap.String("hash", base64.RawURLEncoding.EncodeToString(broadcastRes.Hash)))
	return nil
}

func (g *gnoZenaoChain) eventRealmPkgPath(eventID string) string {
	return fmt.Sprintf("gno.land/r/%s/events/e%s", g.namespace, eventID)
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

func generateEventRealmSource(creatorAddr string, zenaoAdminAddr string, gnoNamespace string, req *zenaov1.CreateEventRequest) (string, error) {
	m := map[string]interface{}{
		"creatorAddr":    creatorAddr,
		"req":            req,
		"zenaoAdminAddr": zenaoAdminAddr,
		"namespace":      gnoNamespace,
		"location":       "&" + req.Location.GnoLiteral("zenaov1.", "\t\t"),
	}

	toMarshal := map[string]interface{}{
		"title":       req.Title,
		"description": req.Description,
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
	DAO daokit.DAO
	daoPrivate *basedao.DAOPrivate
	event *events.Event
)

func init() {
	conf := events.Config{
		Creator: "{{.creatorAddr}}",
		Title: {{.title}},
		Description: {{.description}},
		ImageURI: {{.imageURI}},
		StartDate: {{.req.StartDate}},
		EndDate: {{.req.EndDate}},
		Capacity: {{.req.Capacity}},
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr: "{{.zenaoAdminAddr}}",
		Location: {{.location}},
	}
	event = events.NewEvent(&conf)
	daoPrivate = event.DAOPrivate
	DAO = event.DAO
	eventreg.Register(func() *zenaov1.EventInfo { return event.Info() })
	social_feed.NewFeed("main", false, IsMember)
}

// Set public to be used as auth layer for external entities (e.g polls)
func IsMember(memberId string) bool {
	return daoPrivate.Members.IsMember(memberId)
}

func Vote(proposalID uint64, vote daocond.Vote) {
	DAO.Vote(proposalID, vote)
}

func Execute(proposalID uint64) {
	DAO.Execute(proposalID)
}

func Render(path string) string {
	return event.Render(path)
}
`

func generateUserRealmSource(user *zeni.User, gnoNamespace string, zenaoAdminAddr string) (string, error) {
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
	"gno.land/p/{{.namespace}}/basedao"
	"gno.land/p/{{.namespace}}/daokit"
	"gno.land/p/{{.namespace}}/daocond"
)

var (
	DAO daokit.DAO
	daoPrivate *basedao.DAOPrivate
	user *users.User
)

func init() {
	user = users.NewUser(&users.Config{
		Name: {{.displayName}},
		Bio: {{.bio}},
		AvatarURI: {{.avatarURI}},
		GetProfileString: profile.GetStringField,
		SetProfileString: profile.SetStringField,
		ZenaoAdminAddr: {{.zenaoAdminAddr}},
	})
	DAO = user.DAO
	daoPrivate = user.DAOPrivate
}

func Vote(proposalID uint64, vote daocond.Vote) {
	DAO.Vote(proposalID, vote)
}

func Execute(proposalID uint64) {
	DAO.Execute(proposalID)
}

func Render(path string) string {
	return user.Render(path)
}
`

func extractEventAttribute(event std.GnoEvent, key string) (string, error) {
	for _, attr := range event.Attributes {
		if attr.Key == key {
			return attr.Value, nil
		}
	}
	return "", fmt.Errorf("event %s attribute %s not found", event.Type, key)
}
