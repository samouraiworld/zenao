package main

import (
	"context"
	"crypto"
	"crypto/ed25519"
	srand "crypto/rand"
	"encoding/base64"
	"errors"
	"flag"
	"fmt"
	"os"
	"path"
	"slices"
	"time"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/gnoland"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	"github.com/gnolang/gno/tm2/pkg/amino"
	"github.com/gnolang/gno/tm2/pkg/commands"
	cryptoGno "github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func newGenTxsCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "gentxs",
			ShortUsage: "gentxs",
			ShortHelp:  "generate genesis transactions file",
		},
		&genTxsConf,
		func(ctx context.Context, args []string) error {
			return execGenTxs()
		},
	)
}

var genTxsConf genTxsConfig

type genTxsConfig struct {
	adminMnemonic string
	chainId       string
	dbPath        string
	genesisTime   string
	outputFile    string
	name          string
	verbose       bool
}

func (conf *genTxsConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&genTxsConf.chainId, "chain-id", "dev", "Chain ID")
	flset.StringVar(&genTxsConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&genTxsConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.StringVar(&genTxsConf.outputFile, "output", "genesis_txs.jsonl", "Output file")
	flset.StringVar(&genTxsConf.genesisTime, "genesis-time", "2025-01-15T00:00:00Z", "genesis time formatted as RFC3339: 2006-01-02T15:04:05Z")
	flset.StringVar(&genTxsConf.name, "name", "zenao", "Namespace")
	flset.BoolVar(&genTxsConf.verbose, "v", false, "Enable verbose logging")
}

func execGenTxs() error {
	logger := zap.NewNop()
	if genTxsConf.verbose {
		var err error
		logger, err = zap.NewDevelopment()
		if err != nil {
			return err
		}
	}
	logger.Info("generating genesis txs with args: ", zap.Any("chain-id", genTxsConf.chainId), zap.Any("db-path", genTxsConf.dbPath), zap.Any("output-file", genTxsConf.outputFile), zap.Any("genesis-time", genTxsConf.genesisTime))

	signer, err := gnoclient.SignerFromBip39(genTxsConf.adminMnemonic, "dev", "", 0, 0)
	if err != nil {
		return err
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return err
	}
	signerFromKeybase, ok := signer.(*gnoclient.SignerFromKeybase)
	if !ok {
		return errors.New("signer is not a SignerFromKeybase")
	}
	privKey, err := signerFromKeybase.Keybase.ExportPrivKey(signerInfo.GetName(), "")
	if err != nil {
		return err
	}

	chain := &gnoZenaoChain{
		eventsIndexPkgPath: path.Join("gno.land/r", genTxsConf.name, "eventreg"),
		signerInfo:         signerInfo,
		logger:             logger,
		namespace:          genTxsConf.name,
	}
	logger.Info("Signer initialized", zap.String("address", signerInfo.GetAddress().String()))

	db, err := gzdb.SetupDB(genTxsConf.dbPath)
	if err != nil {
		return err
	}
	logger.Info("database initialized")

	genesisTime, err := time.Parse(time.RFC3339, genTxsConf.genesisTime)
	if err != nil {
		return err
	}
	txs, err := createAdminProfileGenesisTx(logger, signerInfo.GetAddress(), genesisTime)
	if err != nil {
		return err
	}
	logger.Info("admin profile tx created")

	users, err := db.GetAllUsers()
	if err != nil {
		return err
	}

	for _, user := range users {
		tx, err := createUserRealmTx(chain, user, signerInfo.GetAddress())
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("user realm tx created", zap.String("user-id", user.ID))
	}

	events, err := db.GetAllEvents()
	if err != nil {
		return err
	}
	for _, event := range events {
		sk, err := zeni.EventSKFromPasswordHash(event.PasswordHash)
		if err != nil {
			return err
		}

		privacy, err := zeni.EventPrivacyFromSK(sk)
		if err != nil {
			return err
		}

		organizers, err := db.GetEventUsersWithRole(event.ID, "organizer")
		if err != nil {
			return err
		}

		var organizersIDs []string
		for _, org := range organizers {
			organizersIDs = append(organizersIDs, org.ID)
		}
		tx, err := createEventRealmTx(db, chain, event, signerInfo.GetAddress(), organizersIDs, privacy)
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("event realm tx created", zap.String("event-id", event.ID))
		participants, err := db.GetEventUsersWithRole(event.ID, "participant")
		if err != nil {
			return err
		}
		for _, p := range participants {
			tickets, err := db.GetEventUserTickets(event.ID, p.ID)
			if err != nil || len(tickets) < 1 {
				logger.Error("failed to get participant ticket", zap.String("event-id", event.ID), zap.String("user-id", p.ID), zap.Error(err), zap.Int("num-tickets", len(tickets)))
				continue
			}

			for _, ticket := range tickets {
				tx, err := createParticipationTx(chain, signerInfo.GetAddress(), event, ticket, sk)
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("participation tx created", zap.String("event-id", event.ID), zap.String("user-id", p.ID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))

				if ticket.Checkin != nil {
					tx, err := createCheckinTx(chain, signerInfo.GetAddress(), event, ticket, sk)
					if err != nil {
						return err
					}
					txs = append(txs, tx)
					logger.Info("checkin tx created", zap.String("event-id", event.ID), zap.String("user-id", p.ID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
				}
			}
		}
	}

	posts, err := db.GetAllPosts()
	if err != nil {
		return err
	}
	for _, post := range posts {
		feed, err := db.GetFeedByID(post.FeedID)
		if err != nil {
			logger.Error("failed to retrieve feed for post", zap.String("post-id", post.ID), zap.Error(err))
		}

		if slices.Contains(post.Post.Tags, "poll") {
			poll, err := db.GetPollByPostID(post.ID)
			if err != nil {
				logger.Error("failed to retrieve poll for post", zap.String("post-id", post.ID), zap.Error(err))
			}

			var options []string
			for _, res := range poll.Results {
				options = append(options, res.Option)
			}

			tx, err := createPollTx(chain, post.UserID, signerInfo.GetAddress(), feed.EventID, poll, options)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("poll tx created", zap.String("poll-id", poll.ID), zap.String("post-id", post.ID), zap.String("event-id", feed.EventID))
			for _, vote := range poll.Votes {
				tx, err := createVoteTx(chain, vote.UserID, signerInfo.GetAddress(), poll.ID, vote)
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("vote tx created", zap.String("poll-id", poll.ID), zap.String("post-id", post.ID), zap.String("event-id", feed.EventID), zap.String("user-id", vote.UserID))
			}
		} else {
			tx, err := createPostTx(chain, post.UserID, signerInfo.GetAddress(), feed.EventID, post)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("post tx created", zap.String("post-id", post.ID), zap.String("event-id", feed.EventID))
		}

		for _, reaction := range post.Reactions {
			tx, err := createReactionTx(chain, reaction.UserID, signerInfo.GetAddress(), feed.EventID, reaction)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("reaction tx created", zap.String("post-id", post.ID), zap.String("event-id", feed.EventID), zap.String("user-id", reaction.UserID), zap.String("reaction-id", reaction.ID), zap.String("reaction-icon", reaction.Icon))
		}
	}

	if err := gnoland.SignGenesisTxs(txs, privKey, genTxsConf.chainId); err != nil {
		return err
	}
	file, err := os.Create(genTxsConf.outputFile)
	if err != nil {
		return err
	}
	for _, tx := range txs {
		encodedTx, err := amino.MarshalJSON(tx)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(file, "%s\n", encodedTx)
		if err != nil {
			return err
		}
	}

	return nil
}

func createPostTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, eventID string, post *zeni.Post) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(eventID)
	userPkgPath := chain.userRealmPkgPath(authorID)
	feedID := gnolang.DerivePkgAddr(eventPkgPath).String() + ":main"
	gnoLitPost := "&" + post.Post.GnoLiteral("feedsv1.", "\t\t")
	body := genCreatePostMsgRunBody(userPkgPath, feedID, gnoLitPost)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: post.CreatedAt.Unix(),
		},
	}, nil
}

func createReactionTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, eventID string, reaction *zeni.Reaction) (gnoland.TxWithMetadata, error) {
	userPkgPath := chain.userRealmPkgPath(authorID)
	body := genReactPostMsgRunBody(userPkgPath, authorID, reaction.PostID, eventID, reaction.Icon)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: reaction.CreatedAt.Unix(),
		},
	}, nil
}

func createVoteTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, pollID string, vote *zeni.Vote) (gnoland.TxWithMetadata, error) {
	userPkgPath := chain.userRealmPkgPath(authorID)
	body := genVotePollMsgRunBody(userPkgPath, pollID, vote.Option)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: vote.CreatedAt.Unix(),
		},
	}, nil
}

func createPollTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, eventID string, poll *zeni.Poll, options []string) (gnoland.TxWithMetadata, error) {
	userPkgPath := chain.userRealmPkgPath(authorID)
	eventPkgPath := chain.eventRealmPkgPath(eventID)
	feedID := gnolang.DerivePkgAddr(eventPkgPath).String() + ":main"
	body := genCreatePollMsgRunBody(eventPkgPath, userPkgPath, feedID, poll.Question, options, poll.Kind, poll.Duration)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: poll.CreatedAt.Unix(),
		},
	}, nil
}

func createEventRealmTx(db zeni.DB, chain *gnoZenaoChain, event *zeni.Event, creator cryptoGno.Address, organizersIDs []string, privacy *zenaov1.EventPrivacy) (gnoland.TxWithMetadata, error) {
	organizersAddr := mapsl.Map(organizersIDs, chain.UserAddress)
	eRealm, err := genEventRealmSource(organizersAddr, creator.String(), genTxsConf.name, &zenaov1.CreateEventRequest{
		Title:       event.Title,
		Description: event.Description,
		ImageUri:    event.ImageURI,
		Location:    event.Location,
	}, privacy)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	eventTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: creator,
				Deposit: []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "event",
					Path:  eventPkgPath,
					Files: []*gnovm.MemFile{{Name: "event.gno", Body: eRealm}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: eventTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: event.CreatedAt.Unix(),
		},
	}, nil
}

func createParticipationTx(chain *gnoZenaoChain, creator cryptoGno.Address, event *zeni.Event, ticket *zeni.SoldTicket, sk ed25519.PrivateKey) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	callerPkgPath := chain.userRealmPkgPath(event.CreatorID)
	participantAddr := chain.UserAddress(ticket.UserID)

	signature := ""
	if len(sk) != 0 {
		msg := []byte(ticket.Ticket.Pubkey())
		sigBz, err := sk.Sign(srand.Reader, msg, crypto.Hash(0))
		if err != nil {
			return gnoland.TxWithMetadata{}, err
		}
		signature = base64.RawURLEncoding.EncodeToString(sigBz)
	}

	body := genParticipateMsgRunBody(callerPkgPath, eventPkgPath, participantAddr, ticket.Ticket.Pubkey(), signature)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: ticket.CreatedAt.Unix(),
		},
	}, nil
}

func createCheckinTx(chain *gnoZenaoChain, creator cryptoGno.Address, event *zeni.Event, ticket *zeni.SoldTicket, sk ed25519.PrivateKey) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	gatekeeperPkgPath := chain.userRealmPkgPath(ticket.Checkin.GatekeeperID)
	body := genCheckinMsgRunBody(eventPkgPath, gatekeeperPkgPath, ticket.Ticket.Pubkey(), ticket.Checkin.Signature)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "main",
					Files: []*gnovm.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: ticket.CreatedAt.Unix(),
		},
	}, nil
}

func createUserRealmTx(chain *gnoZenaoChain, user *zeni.User, creator cryptoGno.Address) (gnoland.TxWithMetadata, error) {
	uRealm, err := genUserRealmSource(user, genTxsConf.name, creator.String())
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	userPkgPath := chain.userRealmPkgPath(user.ID)
	userTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: creator,
				Deposit: []std.Coin{},
				Package: &gnovm.MemPackage{
					Name:  "user",
					Path:  userPkgPath,
					Files: []*gnovm.MemFile{{Name: "user.gno", Body: uRealm}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: userTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: user.CreatedAt.Unix(),
		},
	}, nil
}

func createAdminProfileGenesisTx(logger *zap.Logger, addr cryptoGno.Address, genesisTime time.Time) ([]gnoland.TxWithMetadata, error) {
	txs := make([]gnoland.TxWithMetadata, 0)
	registerTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  addr,
				Send:    std.NewCoins(std.NewCoin("ugnot", 20_000_000)),
				PkgPath: "gno.land/r/demo/users",
				Func:    "Register",
				Args:    []string{"", "zenaoadm", ""},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	txs = append(txs, gnoland.TxWithMetadata{
		Tx: registerTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: genesisTime.Unix(),
		},
	})

	kv := [][2]string{
		{"DisplayName", "Zenao Admin"},
		{"Avatar", userDefaultAvatar},
		{"Bio", "This is the root zenao admin, it is responsible for managing accounts until they become self-custodial"},
	}

	for _, field := range kv {
		setFieldTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgCall{
					Caller:  addr,
					PkgPath: "gno.land/r/demo/profile",
					Func:    "SetStringField",
					Args:    []string{field[0], field[1]},
				},
			},
			Fee: std.Fee{
				GasWanted: 10000000,
				GasFee:    std.NewCoin("ugnot", 1000000),
			},
		}

		txs = append(txs, gnoland.TxWithMetadata{
			Tx: setFieldTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: genesisTime.Unix(),
			},
		})
	}

	return txs, nil
}
