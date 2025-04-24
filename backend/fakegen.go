package main

import (
	"context"
	"errors"
	"flag"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/go-faker/faker/v4"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	"github.com/samouraiworld/zenao/backend/gzdb"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func newFakegenCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "fakegen",
			ShortUsage: "fakegen",
			ShortHelp:  "generate fake data",
		},
		&fakegenConf,
		func(ctx context.Context, args []string) error {
			return execFakegen()
		},
	)
}

var fakegenConf fakegenConfig

type fakegenConfig struct {
	adminMnemonic string
	gnoNamespace  string
	chainEndpoint string
	chainID       string
	dbPath        string
	eventsCount   uint
	postsCount    uint
	pollsCount    uint
}

func (conf *fakegenConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&fakegenConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&fakegenConf.chainEndpoint, "chain-endpoint", "127.0.0.1:26657", "Gno rpc address")
	flset.StringVar(&fakegenConf.gnoNamespace, "gno-namespace", "zenao", "Gno namespace")
	flset.StringVar(&fakegenConf.chainID, "gno-chain-id", "dev", "Gno chain ID")
	flset.StringVar(&fakegenConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.UintVar(&fakegenConf.eventsCount, "events", 20, "number of fake events to generate")
	flset.UintVar(&fakegenConf.postsCount, "posts", 35, "number of fake posts to generate")
	flset.UintVar(&fakegenConf.pollsCount, "polls", 10, "number of fake polls to generate")
}

type fakeEvent struct {
	Title            string  `faker:"sentence"`
	Description      string  `faker:"paragraph"`
	TicketPrice      float64 `faker:"amount"`
	Capacity         int     `faker:"boundary_start=10, boundary_end=5000"`
	StartOffsetHours int     `faker:"oneof: 24, 48, 72, 96"`
	DurationHours    int     `faker:"oneof: 1, 6, 12"`
	Location         string  `faker:"sentence"`
}

type fakePost struct {
	Content string `faker:"paragraph"`
}

type fakePoll struct {
	Question     string           `faker:"sentence"`
	OptionsCount int              `faker:"boundary_start=2, boundary_end=8"`
	DaysDuration int              `faker:"boundary_start=1, boundary_end=60"`
	Kind         pollsv1.PollKind `faker:"oneof: POLL_KIND_MULTIPLE_CHOICE, POLL_KIND_SINGLE_CHOICE"`
}

func execFakegen() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	chain, err := setupChain(fakegenConf.adminMnemonic, fakegenConf.gnoNamespace, fakegenConf.chainID, fakegenConf.chainEndpoint, logger)
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(fakegenConf.dbPath)
	if err != nil {
		return err
	}

	// Create user
	zUser, err := db.CreateUser("user_2tYwvgu86EutANd5FUalvHvHm05") // alice+clerk_test@example.com
	if err != nil {
		return err
	}

	if err := chain.CreateUser(&zeni.User{ID: zUser.ID}); err != nil {
		return err
	}

	for i := range fakegenConf.eventsCount {
		// Create Event
		a := fakeEvent{}
		err := faker.FakeData(&a)
		if err != nil {
			return err
		}
		before := i <= (fakegenConf.eventsCount / 2)
		if before {
			a.StartOffsetHours = -a.StartOffsetHours
		}
		startDate := time.Now().Add(time.Duration(a.StartOffsetHours) * time.Hour)
		evtReq := &zenaov1.CreateEventRequest{
			Title:       a.Title,
			Description: a.Description,
			ImageUri:    randomPick(eventImages),
			StartDate:   uint64(startDate.Unix()),
			EndDate:     uint64(startDate.Add(time.Duration(a.DurationHours) * time.Hour).Unix()),
			Capacity:    uint32(a.Capacity),
			Location: &zenaov1.EventLocation{
				Address: &zenaov1.EventLocation_Custom{Custom: &zenaov1.AddressCustom{
					Address:  a.Location,
					Timezone: "UTC",
				}},
			},
		}
		creatorID := zUser.ID

		zevt, err := db.CreateEvent(creatorID, evtReq)
		if err != nil {
			return err
		}

		if err := chain.CreateEvent(zevt.ID, creatorID, evtReq); err != nil {
			return err
		}

		// Create Feed
		zfeed, err := db.CreateFeed(zevt.ID, "main")
		if err != nil {
			return err
		}

		// Create posts/polls for only one event to avoid flooding the chain and db
		if i == fakegenConf.eventsCount-1 {
			// Create StandardPosts
			for j := range int(fakegenConf.postsCount) {
				p := fakePost{}
				err := faker.FakeData(&p)
				if err != nil {
					return err
				}

				post := &feedsv1.Post{
					Author:    creatorID,
					CreatedAt: startDate.Add(-time.Duration(j) * time.Hour).Unix(), //One post per hour
					Post: &feedsv1.Post_Standard{
						Standard: &feedsv1.StandardPost{
							Content: p.Content,
						},
					},
				}

				postID, err := chain.CreatePost(creatorID, zevt.ID, post)
				if err != nil {
					return err
				}

				if _, err := db.CreatePost(postID, zfeed.ID, userId, post); err != nil {
					return err
				}
			}

			// Create Polls
			for range int(fakegenConf.pollsCount) {
				p := fakePoll{}
				err := faker.FakeData(&p)
				if err != nil {
					return err
				}

				// Make random words options
				options := make([]string, p.OptionsCount)
				for i := range p.OptionsCount {
					var word string
					err := faker.FakeData(&word)
					if err != nil {
						return err
					}
					options[i] = word
				}

				pollReq := &zenaov1.CreatePollRequest{
					EventId:  zevt.ID,
					Question: p.Question,
					Options:  options,
					Duration: int64(p.DaysDuration * 24 * 60 * 60),
					Kind:     p.Kind,
				}

				pollID, postID, err := chain.CreatePoll(creatorID, pollReq)
				if err != nil {
					return err
				}

				if _, err := db.CreatePoll(pollID, postID, pollReq); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func randomPick[T any](s []T) T {
	if len(s) == 0 {
		panic(errors.New("can't pick from empty slice"))
	}
	idxs, err := faker.RandomInt(0, len(s)-1)
	if err != nil {
		panic(err)
	}
	return s[idxs[0]]
}

// loremflickr just got hit by flickr api restrictions so we use wikimedia images
var eventImages = []string{
	"https://upload.wikimedia.org/wikipedia/commons/2/2c/VIP_Party_%2810580932805%29.jpg?20140329180710",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Brighton%2C_Party_in_the_Park_2002.jpg/1599px-Brighton%2C_Party_in_the_Park_2002.jpg?20210120152026",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/The_Yellow_Fellowship.jpg/640px-The_Yellow_Fellowship.jpg",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Hipp_hipp_hurra%21_Konstn%C3%A4rsfest_p%C3%A5_Skagen_-_Peder_Severin_Kr%C3%B8yer.jpg/640px-Hipp_hipp_hurra%21_Konstn%C3%A4rsfest_p%C3%A5_Skagen_-_Peder_Severin_Kr%C3%B8yer.jpg",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Brussels_2005-04_-_art_%284887177097%29.jpg/640px-Brussels_2005-04_-_art_%284887177097%29.jpg",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2019_Meeting.jpg/640px-2019_Meeting.jpg",
	"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Sheffield_Steel_Rollergirls_vs_Nothing_Toulouse_-_2014-03-29_-_8781.jpg/640px-Sheffield_Steel_Rollergirls_vs_Nothing_Toulouse_-_2014-03-29_-_8781.jpg",
}
