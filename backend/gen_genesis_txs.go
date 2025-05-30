package main

import (
	"context"
	"crypto"
	srand "crypto/rand"
	"encoding/base64"
	"errors"
	"flag"
	"fmt"
	"os"
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

// FORMAT OF THE FILE IS:

// {"tx": {"msg":[{"@type":"/vm.m_call","caller":"g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj","send":"1000000ugnot","pkg_path":"gno.land/r/gnoland/users/v1","func":"Register","args":["administrator123"]}],"fee":{"gas_wanted":"2000000","gas_fee":"1000000ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"AmG6kzznyo1uNqWPAYU6wDpsmzQKDaEOrVRaZ08vOyX0"},"signature":""}],"memo":""}}
// {"tx": {"msg":[{"@type":"/vm.m_call","caller":"g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj","send":"1000000ugnot","pkg_path":"gno.land/r/gnoland/users/v1","func":"Register","args":["administrator123"]}],"fee":{"gas_wanted":"2000000","gas_fee":"1000000ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"AmG6kzznyo1uNqWPAYU6wDpsmzQKDaEOrVRaZ08vOyX0"},"signature":""}],"memo":""}}
// ...

func newGenGenesisTxsCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "gen-genesis-txs",
			ShortUsage: "gen-genesis-txs",
			ShortHelp:  "generate genesis transactions",
		},
		&genGenesisTxsConf,
		func(ctx context.Context, args []string) error {
			return execGenGenesisTxs()
		},
	)
}

var genGenesisTxsConf genGenesisTxsConfig

type genGenesisTxsConfig struct {
	adminMnemonic string
	chainId       string
	outputFile    string
	dbPath        string
}

func (conf *genGenesisTxsConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&genGenesisTxsConf.chainId, "chain-id", "dev", "Chain ID")
	flset.StringVar(&genGenesisTxsConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&genGenesisTxsConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.StringVar(&genGenesisTxsConf.outputFile, "output", "genesis_txs.jsonl", "Output file")
}

func execGenGenesisTxs() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	signer, err := gnoclient.SignerFromBip39(genGenesisTxsConf.adminMnemonic, "dev", "", 0, 0)
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

	db, err := gzdb.SetupDB(genGenesisTxsConf.dbPath)
	if err != nil {
		return err
	}

	// first commit on zenao was on 15th of January 2025
	// TODO: make it a cli arg later
	genesisTime := time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC)
	txs, err := createAdminProfileGenesisTx(logger, signerInfo.GetAddress(), genesisTime)
	if err != nil {
		return err
	}

	users, err := db.GetAllUsers()
	if err != nil {
		return err
	}

	for _, user := range users {
		uRealm, err := generateUserRealmSource(user, "zenao", signerInfo.GetAddress().String())
		if err != nil {
			return err
		}
		userPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", user.ID)
		userTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgAddPackage{
					Creator: signerInfo.GetAddress(),
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
		txs = append(txs, gnoland.TxWithMetadata{
			Tx: userTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: user.CreatedAt.Unix(),
			},
		})
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

		organizersAddr := mapsl.Map(organizersIDs, func(id string) string {
			return gnolang.DerivePkgAddr(fmt.Sprintf("gno.land/r/zenao/users/u%s", id)).String()
		})

		eRealm, err := generateEventRealmSource(organizersAddr, signerInfo.GetAddress().String(), "zenao", &zenaov1.CreateEventRequest{
			Title:       event.Title,
			Description: event.Description,
			ImageUri:    event.ImageURI,
			Location:    event.Location,
		}, privacy)
		if err != nil {
			return err
		}
		eventPkgPath := fmt.Sprintf("gno.land/r/zenao/events/e%s", event.ID)
		eventTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgAddPackage{
					Creator: signerInfo.GetAddress(),
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

		txs = append(txs, gnoland.TxWithMetadata{
			Tx: eventTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: event.CreatedAt.Unix(),
			},
		})

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
				callerPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", event.CreatorID)
				participantPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", p.ID)
				participantAddr := gnolang.DerivePkgAddr(participantPkgPath).String()

				signature := ""
				if len(sk) != 0 {
					msg := []byte(ticket.Ticket.Pubkey())
					sigBz, err := sk.Sign(srand.Reader, msg, crypto.Hash(0))
					if err != nil {
						return err
					}
					signature = base64.RawURLEncoding.EncodeToString(sigBz)
				}

				body := fmt.Sprintf(`package main
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
							Message: events.NewAddParticipantMsg(%q, %q, %q),
						}),
					})
				}
				`, callerPkgPath, eventPkgPath, "Add participant in "+eventPkgPath, participantAddr, ticket.Ticket.Pubkey(), signature)

				tx := std.Tx{
					Msgs: []std.Msg{
						vm.MsgRun{
							Caller: signerInfo.GetAddress(),
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

				txs = append(txs, gnoland.TxWithMetadata{
					Tx: tx,
					Metadata: &gnoland.GnoTxMetadata{
						Timestamp: ticket.CreatedAt.Unix(),
					},
				})

				if ticket.Checkin != nil {
					gatekeeperPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", ticket.Checkin.GatekeeperID)
					body = fmt.Sprintf(`package main
				
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
					`, eventPkgPath, gatekeeperPkgPath, ticket.Ticket.Pubkey(), ticket.Checkin.Signature)

					tx := std.Tx{
						Msgs: []std.Msg{
							vm.MsgRun{
								Caller: signerInfo.GetAddress(),
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

					txs = append(txs, gnoland.TxWithMetadata{
						Tx: tx,
						Metadata: &gnoland.GnoTxMetadata{
							Timestamp: ticket.Checkin.At.Unix(),
						},
					})
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
		eventPkgPath := fmt.Sprintf("gno.land/r/zenao/events/e%s", feed.EventID)
		userPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", post.UserID)
		feedID := gnolang.DerivePkgAddr(eventPkgPath).String() + ":main"

		if slices.Contains(post.Post.Tags, "poll") {
			poll, err := db.GetPollByPostID(post.ID)
			if err != nil {
				logger.Error("failed to retrieve poll for post", zap.String("post-id", post.ID), zap.Error(err))
			}

			var options []string
			for _, res := range poll.Results {
				options = append(options, res.Option)
			}

			body := fmt.Sprintf(`package main

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
				options := %s
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
			`, eventPkgPath, userPkgPath, poll.Question, stringSliceLit(options), poll.Kind, poll.Duration, gnoEventPollCreate, feedID, gnoEventPostCreate)

			tx := std.Tx{
				Msgs: []std.Msg{
					vm.MsgRun{
						Caller: signerInfo.GetAddress(),
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

			txs = append(txs, gnoland.TxWithMetadata{
				Tx: tx,
				Metadata: &gnoland.GnoTxMetadata{
					Timestamp: post.CreatedAt.Unix(),
				},
			})

			for _, vote := range poll.Votes {
				body := fmt.Sprintf(`package main
				
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
				`, userPkgPath, poll.ID, vote.Option)

				tx := std.Tx{
					Msgs: []std.Msg{
						vm.MsgRun{
							Caller: signerInfo.GetAddress(),
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

				txs = append(txs, gnoland.TxWithMetadata{
					Tx: tx,
					Metadata: &gnoland.GnoTxMetadata{
						Timestamp: vote.CreatedAt.Unix(),
					},
				})
			}
		} else {
			gnoLitPost := "&" + post.Post.GnoLiteral("feedsv1.", "\t\t")
			body := fmt.Sprintf(`package main
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
			`, userPkgPath, feedID, gnoLitPost, gnoEventPostCreate)

			tx := std.Tx{
				Msgs: []std.Msg{
					vm.MsgRun{
						Caller: signerInfo.GetAddress(),
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

			txs = append(txs, gnoland.TxWithMetadata{
				Tx: tx,
				Metadata: &gnoland.GnoTxMetadata{
					Timestamp: post.CreatedAt.Unix(),
				},
			})
		}

		for _, reaction := range post.Reactions {
			userRealmPkgPath := fmt.Sprintf("gno.land/r/zenao/users/u%s", reaction.UserID)
			body := fmt.Sprintf(`package main
			import (
				"gno.land/p/zenao/daokit"
				"gno.land/r/zenao/social_feed"
				user %q
			)
				
			func main() {
				daokit.InstantExecute(user.DAO, daokit.ProposalRequest{
					Title: "User #%s reacts to post #%s in event #%s.",
					Message: daokit.NewExecuteLambdaMsg(newReaction),
				})
			}
			
			func newReaction() {
				social_feed.ReactPost(%s, %q)
			}
			`, userRealmPkgPath, reaction.UserID, reaction.PostID, feed.EventID, reaction.PostID, reaction.Icon)

			tx := std.Tx{
				Msgs: []std.Msg{
					vm.MsgRun{
						Caller: signerInfo.GetAddress(),
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

			txs = append(txs, gnoland.TxWithMetadata{
				Tx: tx,
				Metadata: &gnoland.GnoTxMetadata{
					Timestamp: reaction.CreatedAt.Unix(),
				},
			})
		}
	}

	if err := gnoland.SignGenesisTxs(txs, privKey, genGenesisTxsConf.chainId); err != nil {
		return err
	}

	file, err := os.Create(genGenesisTxsConf.outputFile)
	if err != nil {
		return err
	}
	for _, tx := range txs {
		encodedTx, err := amino.MarshalJSON(tx)
		if err != nil {
			return err
		}

		_, err = file.WriteString(fmt.Sprintf("%s\n", encodedTx))
		if err != nil {
			return err
		}
	}

	return nil
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
