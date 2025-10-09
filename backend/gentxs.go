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
	"strconv"
	"time"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/gnoland"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	"github.com/gnolang/gno/tm2/pkg/amino"
	"github.com/gnolang/gno/tm2/pkg/commands"
	cryptoGno "github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"
	tm2std "github.com/gnolang/gno/tm2/pkg/std"
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
		eventsIndexPkgPath:      path.Join("gno.land/r", genTxsConf.name, "eventreg"),
		communitiesIndexPkgPath: path.Join("gno.land/r", genTxsConf.name, "communityreg"),
		signerInfo:              signerInfo,
		logger:                  logger,
		namespace:               genTxsConf.name,
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
	deletedEvents, err := db.GetDeletedEvents()
	if err != nil {
		return err
	}
	events = append(events, deletedEvents...)
	for _, deletedEvent := range deletedEvents {
		tx, err := createCancelEventTx(chain, deletedEvent, signerInfo.GetAddress())
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("event cancel tx created", zap.String("event-id", deletedEvent.ID))
		tx, err = createCancelEventRegTx(chain, deletedEvent, signerInfo.GetAddress())
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("event cancel indexed into event registry tx created", zap.String("event-id", deletedEvent.ID))
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

		organizers, err := db.GetOrgEntitiesWithRole(zeni.EntityTypeEvent, event.ID, zeni.EntityTypeUser, zeni.RoleOrganizer)
		if err != nil {
			return err
		}

		var organizersIDs []string
		for _, org := range organizers {
			organizersIDs = append(organizersIDs, org.EntityID)
		}

		gatekeepers, err := db.GetOrgEntitiesWithRole(zeni.EntityTypeEvent, event.ID, zeni.EntityTypeUser, zeni.RoleGatekeeper)
		if err != nil {
			return err
		}

		deletedGatekeepers, err := db.GetDeletedOrgEntitiesWithRole(zeni.EntityTypeEvent, event.ID, zeni.EntityTypeUser, zeni.RoleGatekeeper)
		if err != nil {
			return err
		}

		var gatekeepersIDs []string
		for _, gkp := range gatekeepers {
			gatekeepersIDs = append(gatekeepersIDs, gkp.EntityID)
		}

		for _, deletedGkp := range deletedGatekeepers {
			gatekeepersIDs = append(gatekeepersIDs, deletedGkp.EntityID)
			tx, err := createEventRemoveGatekeeperTx(chain, signerInfo.GetAddress(), event, deletedGkp.EntityID, deletedGkp.DeletedAt)
			logger.Info("event remove gatekeeper tx created", zap.String("event-id", event.ID), zap.String("gatekeeper-id", deletedGkp.EntityID), zap.Time("deleted-at", deletedGkp.DeletedAt))
			if err != nil {
				return err
			}
			txs = append(txs, tx)
		}

		tx, err := createEventRealmTx(chain, event, signerInfo.GetAddress(), organizersIDs, gatekeepersIDs, privacy)
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("event realm tx created", zap.String("event-id", event.ID))
		tx, err = createEventRegTx(chain, event, signerInfo.GetAddress())
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("event indexed into event registry tx created", zap.String("event-id", event.ID))
		tickets, err := db.GetEventTickets(event.ID)
		if err != nil {
			return err
		}
		for _, ticket := range tickets {
			tx, err := createParticipationTx(chain, signerInfo.GetAddress(), event, ticket, sk)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("participation tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			if ticket.UserID != "" {
				tx, err = createParticipationRegTx(chain, event, signerInfo.GetAddress(), ticket, chain.UserAddress(ticket.UserID))
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("participation indexed into event registry tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			}
			if ticket.Checkin != nil {
				tx, err := createCheckinTx(chain, signerInfo.GetAddress(), event, ticket, sk)
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("checkin tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			}
		}
		deletedTickets, err := db.GetDeletedTickets(event.ID)
		if err != nil {
			return err
		}
		for _, ticket := range deletedTickets {
			tx, err := createParticipationTx(chain, signerInfo.GetAddress(), event, ticket, sk)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("participation tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			tx, err = createCancelParticipationTx(chain, event, signerInfo.GetAddress(), ticket)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("cancel participation tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			if ticket.UserID != "" {
				tx, err = createParticipationRegTx(chain, event, signerInfo.GetAddress(), ticket, chain.UserAddress(ticket.UserID))
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("participation indexed into event registry tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
				tx, err = createCancelParticipationRegTx(chain, event, signerInfo.GetAddress(), ticket, chain.UserAddress(ticket.UserID))
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("cancel participation indexed into event registry tx created", zap.String("event-id", event.ID), zap.String("user-id", ticket.UserID), zap.String("ticket-pubkey", ticket.Ticket.Pubkey()))
			}
		}
	}

	//TODO: use proposals tx to add members to avoid loosing time of joining the community
	communities, err := db.GetAllCommunities()
	if err != nil {
		return err
	}

	for _, community := range communities {
		administrators, err := db.GetOrgEntitiesWithRole(zeni.EntityTypeCommunity, community.ID, zeni.EntityTypeUser, zeni.RoleAdministrator)
		if err != nil {
			return err
		}

		var administratorsIDs []string
		for _, admin := range administrators {
			administratorsIDs = append(administratorsIDs, admin.EntityID)
		}

		members, err := db.GetOrgEntitiesWithRole(zeni.EntityTypeCommunity, community.ID, zeni.EntityTypeUser, zeni.RoleMember)
		if err != nil {
			return err
		}

		deletedMembers, err := db.GetDeletedOrgEntitiesWithRole(zeni.EntityTypeCommunity, community.ID, zeni.EntityTypeUser, zeni.RoleMember)
		if err != nil {
			return err
		}

		var membersIDs []string
		for _, member := range members {
			membersIDs = append(membersIDs, member.EntityID)
			tx, err := createCommunityAddMemberRegTx(chain, signerInfo.GetAddress(), community, member.EntityID, member.CreatedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community add member reg tx created", zap.String("community-id", community.ID), zap.String("member-id", member.EntityID), zap.Time("created-at", member.CreatedAt))
		}

		// admin are also members and the community registry does not make the difference
		for _, admin := range administrators {
			membersIDs = append(membersIDs, admin.EntityID)
			tx, err := createCommunityAddMemberRegTx(chain, signerInfo.GetAddress(), community, admin.EntityID, admin.CreatedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community add member reg tx created", zap.String("community-id", community.ID), zap.String("admin-id", admin.EntityID), zap.Time("created-at", admin.CreatedAt))
		}

		// XXX: Add deleted members so we can add their post before deleting them
		for _, deletedMember := range deletedMembers {
			membersIDs = append(membersIDs, deletedMember.EntityID)
			tx, err := createCommunityAddMemberRegTx(chain, signerInfo.GetAddress(), community, deletedMember.EntityID, deletedMember.CreatedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			tx, err = createCommunityRemoveMemberTx(chain, signerInfo.GetAddress(), community, deletedMember.EntityID, deletedMember.DeletedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community remove member tx created", zap.String("community-id", community.ID), zap.String("member-id", deletedMember.EntityID), zap.Time("deleted-at", deletedMember.DeletedAt))
			tx, err = createCommunityRemoveMemberRegTx(chain, community, signerInfo.GetAddress(), deletedMember.EntityID, deletedMember.DeletedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community remove member indexed into community registry tx created", zap.String("community-id", community.ID), zap.String("member-id", deletedMember.EntityID), zap.Time("deleted-at", deletedMember.DeletedAt))
		}

		events, err := db.GetOrgEntitiesWithRole(zeni.EntityTypeCommunity, community.ID, zeni.EntityTypeEvent, zeni.RoleEvent)
		if err != nil {
			return err
		}

		deletedEvents, err := db.GetDeletedOrgEntitiesWithRole(zeni.EntityTypeCommunity, community.ID, zeni.EntityTypeEvent, zeni.RoleEvent)
		if err != nil {
			return err
		}

		var eventsIDs []string
		for _, event := range events {
			eventsIDs = append(eventsIDs, event.EntityID)
			tx, err := createCommunityAddEventRegTx(chain, signerInfo.GetAddress(), community, event.EntityID, event.CreatedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community add event reg tx created", zap.String("community-id", community.ID), zap.String("event-id", event.EntityID), zap.Time("created-at", event.CreatedAt))
		}

		// XXX: Add deleted events so we can add their post before deleting them
		for _, deletedEvent := range deletedEvents {
			eventsIDs = append(eventsIDs, deletedEvent.EntityID)
			tx, err := createCommunityAddEventRegTx(chain, signerInfo.GetAddress(), community, deletedEvent.EntityID, deletedEvent.CreatedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community add event reg tx created", zap.String("community-id", community.ID), zap.String("event-id", deletedEvent.EntityID), zap.Time("created-at", deletedEvent.CreatedAt))
			tx, err = createCommunityRemoveEventTx(chain, signerInfo.GetAddress(), community, deletedEvent.EntityID, deletedEvent.DeletedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community remove event tx created", zap.String("community-id", community.ID), zap.String("event-id", deletedEvent.EntityID), zap.Time("deleted-at", deletedEvent.DeletedAt))
			tx, err = createCommunityRemoveEventRegTx(chain, signerInfo.GetAddress(), community, deletedEvent.EntityID, deletedEvent.DeletedAt)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("community remove event indexed into community registry tx created", zap.String("community-id", community.ID), zap.String("event-id", deletedEvent.EntityID), zap.Time("deleted-at", deletedEvent.DeletedAt))
		}

		tx, err := createCommunityRealmTx(chain, community, signerInfo.GetAddress(), administratorsIDs, membersIDs, eventsIDs)
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("community realm tx created", zap.String("community-id", community.ID))
		tx, err = createCommunityRegTx(chain, community, signerInfo.GetAddress())
		if err != nil {
			return err
		}
		txs = append(txs, tx)
		logger.Info("community indexed into community registry tx created", zap.String("community-id", community.ID))
	}

	posts, err := db.GetAllPosts(true)
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

			tx, err := createPollTx(chain, post.UserID, signerInfo.GetAddress(), feed.OrgType, feed.OrgID, poll, options)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("poll tx created", zap.String("poll-id", poll.ID), zap.String("post-id", post.ID), zap.String("org-type", feed.OrgType), zap.String("org-id", feed.OrgID), zap.String("user-id", post.UserID))
			for _, vote := range poll.Votes {
				tx, err := createVoteTx(chain, vote.UserID, signerInfo.GetAddress(), poll.ID, vote)
				if err != nil {
					return err
				}
				txs = append(txs, tx)
				logger.Info("vote tx created", zap.String("poll-id", poll.ID), zap.String("post-id", post.ID), zap.String("org-type", feed.OrgType), zap.String("org-id", feed.OrgID), zap.String("user-id", vote.UserID), zap.String("vote-option", vote.Option))
			}
		} else {
			cptxs, err := createPostTxs(chain, post.UserID, signerInfo.GetAddress(), feed.OrgType, feed.OrgID, post)
			if err != nil {
				return err
			}
			txs = append(txs, cptxs...)
			logger.Info("post tx created", zap.String("post-id", post.ID), zap.String("org-type", feed.OrgType), zap.String("org-id", feed.OrgID), zap.String("user-id", post.UserID))
		}

		for _, reaction := range post.Reactions {
			tx, err := createReactionTx(chain, reaction.UserID, signerInfo.GetAddress(), feed.OrgType, feed.OrgID, reaction)
			if err != nil {
				return err
			}
			txs = append(txs, tx)
			logger.Info("reaction tx created", zap.String("post-id", post.ID), zap.String("org-type", feed.OrgType), zap.String("org-id", feed.OrgID), zap.String("user-id", reaction.UserID), zap.String("reaction-id", reaction.ID), zap.String("reaction-icon", reaction.Icon))
		}
	}

	slices.SortStableFunc(txs, func(a, b gnoland.TxWithMetadata) int {
		if a.Metadata == nil || b.Metadata == nil {
			return 0 // If metadata is nil, we can't compare timestamps
		}
		if a.Metadata.Timestamp < b.Metadata.Timestamp {
			return -1
		} else if a.Metadata.Timestamp > b.Metadata.Timestamp {
			return 1
		}
		return 0
	})

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

func createPostTxs(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, orgType string, orgID string, post *zeni.Post) ([]gnoland.TxWithMetadata, error) {
	orgPkgPath := chain.orgPkgPath(orgType, orgID)
	userPkgPath := chain.userRealmPkgPath(authorID)
	feedID := gnolang.DerivePkgBech32Addr(orgPkgPath).String() + ":main"
	gnoLitPost := "&" + post.Post.GnoLiteral("feedsv1.", "\t\t")
	body := genCreatePostMsgRunBody(userPkgPath, feedID, gnoLitPost)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	txs := []gnoland.TxWithMetadata{{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: post.CreatedAt.Unix(),
		},
	}}

	if post.Post.DeletedAt != 0 {
		postIDInt, err := strconv.ParseUint(post.ID, 10, 64)
		if err != nil {
			return nil, err
		}
		body := genDeletePostMsgRunBody(userPkgPath, postIDInt)
		tx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgRun{
					Caller: creator,
					Send:   []std.Coin{},
					Package: &tm2std.MemPackage{
						Name:  "main",
						Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
				Timestamp: post.Post.DeletedAt,
			},
		})
	}

	return txs, nil
}

func createReactionTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, orgType string, orgID string, reaction *zeni.Reaction) (gnoland.TxWithMetadata, error) {
	userPkgPath := chain.userRealmPkgPath(authorID)
	body := genReactPostMsgRunBody(userPkgPath, authorID, reaction.PostID, orgType, orgID, reaction.Icon)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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

func createPollTx(chain *gnoZenaoChain, authorID string, creator cryptoGno.Address, orgType string, orgID string, poll *zeni.Poll, options []string) (gnoland.TxWithMetadata, error) {
	userPkgPath := chain.userRealmPkgPath(authorID)
	orgPkgPath := chain.orgPkgPath(orgType, orgID)
	feedID := gnolang.DerivePkgBech32Addr(orgPkgPath).String() + ":main"
	body := genCreatePollMsgRunBody(orgPkgPath, userPkgPath, feedID, poll.Question, options, poll.Kind, poll.Duration)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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

func createEventRegTx(chain *gnoZenaoChain, event *zeni.Event, caller cryptoGno.Address) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.eventsIndexPkgPath,
				Func:    "IndexEvent",
				Args:    []string{eventPkgPath},
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
			Timestamp: event.CreatedAt.Unix() + 1, // +1 to avoid collision with event creation
		},
	}, nil
}

func createEventRealmTx(chain *gnoZenaoChain, event *zeni.Event, creator cryptoGno.Address, organizersIDs []string, gatekeepersIDs []string, privacy *zenaov1.EventPrivacy) (gnoland.TxWithMetadata, error) {
	organizersAddr := mapsl.Map(organizersIDs, chain.UserAddress)
	gatekeepersAddr := mapsl.Map(gatekeepersIDs, chain.UserAddress)
	eRealm, err := genEventRealmSource(organizersAddr, gatekeepersAddr, creator.String(), genTxsConf.name, &zenaov1.CreateEventRequest{
		Title:        event.Title,
		Description:  event.Description,
		ImageUri:     event.ImageURI,
		Location:     event.Location,
		StartDate:    uint64(event.StartDate.Unix()),
		EndDate:      uint64(event.EndDate.Unix()),
		Capacity:     event.Capacity,
		Discoverable: event.Discoverable,
	}, privacy)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	eventTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: creator,
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "event",
					Path: eventPkgPath,
					Files: []*tm2std.MemFile{
						{Name: "event.gno", Body: eRealm},
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", eventPkgPath)},
					},
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

func createCancelEventTx(chain *gnoZenaoChain, event *zeni.Event, caller cryptoGno.Address) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	creatorPkgPath := chain.userRealmPkgPath(event.CreatorID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: caller,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "main",
					Files: []*tm2std.MemFile{{
						Name: "main.gno",
						Body: genCancelEventMsgRunBody(eventPkgPath, creatorPkgPath),
					}},
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
			Timestamp: event.DeletedAt.Unix(),
		},
	}, nil
}

func createCancelEventRegTx(chain *gnoZenaoChain, event *zeni.Event, caller cryptoGno.Address) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.eventsIndexPkgPath,
				Func:    "RemoveIndex",
				Args:    []string{eventPkgPath},
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
			Timestamp: event.DeletedAt.Unix() + 1, // +1 to avoid collision with cancel event tx.
		},
	}, nil
}

func createParticipationRegTx(chain *gnoZenaoChain, event *zeni.Event, caller cryptoGno.Address, ticket *zeni.SoldTicket, participantAddr string) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.eventsIndexPkgPath,
				Func:    "AddParticipant",
				Args:    []string{eventPkgPath, participantAddr},
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

func createCancelParticipationRegTx(chain *gnoZenaoChain, event *zeni.Event, caller cryptoGno.Address, ticket *zeni.SoldTicket, participantAddr string) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.eventsIndexPkgPath,
				Func:    "RemoveParticipant",
				Args:    []string{eventPkgPath, participantAddr},
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
			Timestamp: ticket.DeletedAt.Unix() + 1, // +1 to avoid collision with cancel participation tx.
		},
	}, nil
}

func createCancelParticipationTx(chain *gnoZenaoChain, event *zeni.Event, creator cryptoGno.Address, ticket *zeni.SoldTicket) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	callerPkgPath := chain.userRealmPkgPath(event.CreatorID)
	participantAddr := chain.UserAddress(ticket.UserID)
	body := genCancelParticipationMsgRunBody(callerPkgPath, eventPkgPath, participantAddr, ticket.Ticket.Pubkey())

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
			Timestamp: ticket.DeletedAt.Unix(),
		},
	}, nil
}

func createParticipationTx(chain *gnoZenaoChain, creator cryptoGno.Address, event *zeni.Event, ticket *zeni.SoldTicket, sk ed25519.PrivateKey) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	callerPkgPath := chain.userRealmPkgPath(event.CreatorID)
	var participantAddr string
	if ticket.UserID != "" {
		participantAddr = chain.UserAddress(ticket.UserID)
	}

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
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 20000000,
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
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
			Timestamp: ticket.Checkin.At.Unix(),
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
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "user",
					Path: userPkgPath,
					Files: []*tm2std.MemFile{
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", userPkgPath)},
						{Name: "user.gno", Body: uRealm},
					},
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
				Send:    std.NewCoins(std.NewCoin("ugnot", 1_000_000)),
				PkgPath: "gno.land/r/gnoland/users/v1",
				Func:    "Register",
				Args:    []string{"zenaoadm4242"},
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

func createCommunityRegTx(chain *gnoZenaoChain, community *zeni.Community, caller cryptoGno.Address) (gnoland.TxWithMetadata, error) {
	communityPkgPath := chain.communityPkgPath(community.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "IndexCommunity",
				Args:    []string{communityPkgPath},
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
			Timestamp: community.CreatedAt.Unix() + 1, // +1 to avoid collision with community creation
		},
	}, nil
}

func createCommunityAddMemberRegTx(chain *gnoZenaoChain, caller cryptoGno.Address, community *zeni.Community, memberID string, createdAt time.Time) (gnoland.TxWithMetadata, error) {
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "AddMember",
				Args:    []string{chain.communityPkgPath(community.ID), chain.UserAddress(memberID)},
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
			Timestamp: createdAt.Unix() + 2, // +2 to avoid collision with community reg index
		},
	}, nil
}

func createCommunityAddEventRegTx(chain *gnoZenaoChain, caller cryptoGno.Address, community *zeni.Community, eventID string, createdAt time.Time) (gnoland.TxWithMetadata, error) {
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "AddEvent",
				Args:    []string{chain.communityPkgPath(community.ID), chain.EventAddress(eventID)},
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
			Timestamp: createdAt.Unix() + 2, // +2 to avoid collision with community reg index
		},
	}, nil
}

func createCommunityRemoveEventRegTx(chain *gnoZenaoChain, caller cryptoGno.Address, community *zeni.Community, eventID string, deletedAt time.Time) (gnoland.TxWithMetadata, error) {
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "RemoveEvent",
				Args:    []string{chain.communityPkgPath(community.ID), chain.EventAddress(eventID)},
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
			Timestamp: deletedAt.Unix() + 1, // +1 to avoid collision with community reg index
		},
	}, nil
}

func createCommunityRealmTx(chain *gnoZenaoChain, community *zeni.Community, creator cryptoGno.Address, administratorsIDs []string, membersIDs []string, eventsIDs []string) (gnoland.TxWithMetadata, error) {
	administratorsAddrs := mapsl.Map(administratorsIDs, chain.UserAddress)
	membersAddrs := mapsl.Map(membersIDs, chain.UserAddress)
	eventsAddrs := mapsl.Map(eventsIDs, chain.EventAddress)
	cRealm, err := genCommunityRealmSource(administratorsAddrs, membersAddrs, eventsAddrs, creator.String(), genTxsConf.name, &zenaov1.CreateCommunityRequest{
		DisplayName: community.DisplayName,
		Description: community.Description,
		AvatarUri:   community.AvatarURI,
		BannerUri:   community.BannerURI,
	})
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	communityPkgPath := chain.communityPkgPath(community.ID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: creator,
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "community",
					Path: communityPkgPath,
					Files: []*tm2std.MemFile{
						{Name: "community.gno", Body: cRealm},
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", communityPkgPath)},
					},
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
			Timestamp: community.CreatedAt.Unix(),
		},
	}, nil
}

func createEventRemoveGatekeeperTx(chain *gnoZenaoChain, creator cryptoGno.Address, event *zeni.Event, gatekeeperID string, deletedAt time.Time) (gnoland.TxWithMetadata, error) {
	eventPkgPath := chain.eventRealmPkgPath(event.ID)
	gatekeeper := chain.userRealmPkgPath(gatekeeperID)
	callerPkgPath := chain.userRealmPkgPath(event.CreatorID)
	body := genEventRemoveGatekeeperMsgRunBody(callerPkgPath, eventPkgPath, gatekeeper)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
			Timestamp: deletedAt.Unix(),
		},
	}, nil
}

func createCommunityRemoveMemberTx(chain *gnoZenaoChain, creator cryptoGno.Address, community *zeni.Community, memberID string, deletedAt time.Time) (gnoland.TxWithMetadata, error) {
	communityPkgPath := chain.communityPkgPath(community.ID)
	callerPkgPath := chain.userRealmPkgPath(community.CreatorID)
	memberAddr := chain.UserAddress(memberID)
	body := genCommunityRemoveMemberMsgRunBody(callerPkgPath, communityPkgPath, memberAddr)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
			Timestamp: deletedAt.Unix(),
		},
	}, nil
}

func createCommunityRemoveMemberRegTx(chain *gnoZenaoChain, community *zeni.Community, caller cryptoGno.Address, memberID string, deletedAt time.Time) (gnoland.TxWithMetadata, error) {
	communityPkgPath := chain.communityPkgPath(community.ID)
	userAddr := chain.UserAddress(memberID)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  caller,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "RemoveMember",
				Args:    []string{communityPkgPath, userAddr},
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
			Timestamp: deletedAt.Unix() + 1, // +1 to avoid collision with member removal
		},
	}, nil
}

func createCommunityRemoveEventTx(chain *gnoZenaoChain, creator cryptoGno.Address, community *zeni.Community, eventID string, deletedAt time.Time) (gnoland.TxWithMetadata, error) {
	communityPkgPath := chain.communityPkgPath(community.ID)
	eventAddr := chain.EventAddress(eventID)
	callerPkgPath := chain.userRealmPkgPath(community.CreatorID)
	body := genCommunityRemoveEventMsgRunBody(callerPkgPath, communityPkgPath, eventAddr)

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: creator,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
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
			Timestamp: deletedAt.Unix(),
		},
	}, nil
}
