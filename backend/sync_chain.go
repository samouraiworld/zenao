package main

import (
	"context"
	"flag"
	"slices"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func newSyncChainCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "sync-chain",
			ShortUsage: "sync-chain",
			ShortHelp:  "replicate db data on-chain",
		},
		&syncChainConf,
		func(ctx context.Context, args []string) error {
			return execSyncChain()
		},
	)
}

var syncChainConf syncChainConfig

type syncChainConfig struct {
	adminMnemonic string
	gnoNamespace  string
	chainEndpoint string
	chainID       string
	dbPath        string
}

func (conf *syncChainConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&syncChainConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&syncChainConf.chainEndpoint, "chain-endpoint", "127.0.0.1:26657", "Gno rpc address")
	flset.StringVar(&syncChainConf.gnoNamespace, "gno-namespace", "zenao", "Gno namespace")
	flset.StringVar(&syncChainConf.chainID, "gno-chain-id", "dev", "Gno chain ID")
	flset.StringVar(&syncChainConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
}

func execSyncChain() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	chain, err := setupChain(syncChainConf.adminMnemonic, syncChainConf.gnoNamespace, syncChainConf.chainID, syncChainConf.chainEndpoint, logger)
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(syncChainConf.dbPath)
	if err != nil {
		return err
	}

	chain.FillAdminProfile()

	users, err := db.GetAllUsers()
	if err != nil {
		return err
	}
	for _, user := range users {
		if err := chain.CreateUser(user); err != nil {
			logger.Error("failed to create user", zap.String("user-id", user.ID), zap.Error(err))
		}
	}

	events, err := db.GetAllEvents()
	if err != nil {
		return err
	}
	for _, event := range events {
		sk, err := zeni.EventSKFromPasswordHash(event.PasswordHash)
		if err != nil {
			logger.Error("can't derive event sk", zap.String("event-id", event.ID), zap.Error(err))
			continue
		}

		privacy, err := zeni.EventPrivacyFromSK(sk)
		if err != nil {
			logger.Error("can't derive event privacy", zap.String("event-id", event.ID), zap.Error(err))
			continue
		}

		if err := chain.CreateEvent(event.ID, event.CreatorID, &zenaov1.CreateEventRequest{
			Title:       event.Title,
			Description: event.Description,
			ImageUri:    event.ImageURI,
			StartDate:   uint64(event.StartDate.Unix()),
			EndDate:     uint64(event.EndDate.Unix()),
			TicketPrice: event.TicketPrice,
			Capacity:    event.Capacity,
			Location:    event.Location,
		}, privacy); err != nil {
			logger.Error("failed to create event", zap.String("event-id", event.ID), zap.Error(err))
			continue
		}

		participants, err := db.GetAllParticipants(event.ID)
		if err != nil {
			logger.Error("failed to get participants of event", zap.String("event-id", event.ID), zap.Error(err))
			continue
		}
		for _, p := range participants {
			tickets, err := db.GetEventUserTickets(event.ID, p.ID)
			if err != nil || len(tickets) < 1 {
				logger.Error("failed to get participant ticket", zap.String("event-id", event.ID), zap.String("user-id", p.ID), zap.Error(err), zap.Int("num-tickets", len(tickets)))
				continue
			}

			for _, ticket := range tickets {
				if err := chain.Participate(event.ID, event.CreatorID, ticket.UserID, ticket.Ticket.Pubkey(), sk); err != nil {
					logger.Error("failed to add participation", zap.String("event-id", event.ID), zap.String("user-id", p.ID), zap.Error(err))
				}

				if ticket.Checkin != nil {
					if err := chain.Checkin(event.ID, ticket.Checkin.GatekeeperID, &zenaov1.CheckinRequest{
						TicketPubkey: ticket.Ticket.Pubkey(),
						Signature:    ticket.Checkin.Signature,
					}); err != nil {
						logger.Error("failed to add checkin", zap.String("event-id", event.ID), zap.Error(err))
					}
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

			if _, _, err = chain.CreatePoll(post.UserID, &zenaov1.CreatePollRequest{
				EventId:  feed.EventID,
				Question: poll.Question,
				Options:  options,
				Duration: poll.Duration,
				Kind:     poll.Kind,
			}); err != nil {
				logger.Error("failed to create poll", zap.String("poll-id", poll.ID), zap.String("post-id", post.ID), zap.Error(err))
			}

			for _, vote := range poll.Votes {
				if err := chain.VotePoll(vote.UserID, &zenaov1.VotePollRequest{
					PollId: poll.ID,
					Option: vote.Option,
				}); err != nil {
					logger.Error("failed to vote poll", zap.String("poll-id", poll.ID), zap.String("user-id", vote.UserID), zap.Error(err))
				}
			}
		} else {
			if _, err = chain.CreatePost(post.UserID, feed.EventID, post.Post); err != nil {
				logger.Error("failed to create post", zap.String("post-id", post.ID), zap.Error(err))
			}
		}

		for _, reaction := range post.Reactions {
			if err := chain.ReactPost(reaction.UserID, feed.EventID, &zenaov1.ReactPostRequest{
				PostId: post.ID,
				Icon:   reaction.Icon,
			}); err != nil {
				logger.Error("failed to react to post", zap.String("post-id", post.ID), zap.Error(err))
			}
		}
	}

	return nil
}
