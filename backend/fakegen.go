package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"strings"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/go-faker/faker/v4"
	"github.com/google/uuid"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	"github.com/samouraiworld/zenao/backend/gzchain"
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
	adminMnemonic    string
	gnoNamespace     string
	chainEndpoint    string
	chainID          string
	dbPath           string
	gasSecurityRate  float64
	communitiesCount uint
	eventsCount      uint
	postsCount       uint
	pollsCount       uint
}

func (conf *fakegenConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&fakegenConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&fakegenConf.chainEndpoint, "chain-endpoint", "127.0.0.1:26657", "Gno rpc address")
	flset.StringVar(&fakegenConf.gnoNamespace, "gno-namespace", "zenao", "Gno namespace")
	flset.StringVar(&fakegenConf.chainID, "gno-chain-id", "dev", "Gno chain ID")
	flset.StringVar(&fakegenConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.Float64Var(&fakegenConf.gasSecurityRate, "gas-security-rate", 0.2, "margin multiplier for estimated gas wanted to be safe")
	flset.UintVar(&fakegenConf.eventsCount, "events", 20, "number of fake events to generate")
	flset.UintVar(&fakegenConf.communitiesCount, "communities", 5, "number of fake communities to generate")
	flset.UintVar(&fakegenConf.postsCount, "posts", 31, "number of fake posts to generate")
	flset.UintVar(&fakegenConf.pollsCount, "polls", 13, "number of fake polls to generate")
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

type fakeCommunity struct {
	Title       string `faker:"sentence"`
	Description string `faker:"paragraph"`
}

type fakePoll struct {
	Question     string `faker:"sentence"`
	OptionsCount int    `faker:"boundary_start=2, boundary_end=8"`
	DaysDuration int    `faker:"boundary_start=1, boundary_end=30"`
	KindRaw      int32  `faker:"oneof: 0, 1"`
}

func execFakegen() (retErr error) {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	chain, err := gzchain.SetupChain(fakegenConf.adminMnemonic, fakegenConf.gnoNamespace, fakegenConf.chainID, fakegenConf.chainEndpoint, fakegenConf.gasSecurityRate, logger)
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(fakegenConf.dbPath)
	if err != nil {
		return err
	}

	err = RegisterMultiAddrProtocols()
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

	logger.Info("creating events")
	for eC := range fakegenConf.eventsCount {
		// Create Event
		a := fakeEvent{}
		err := faker.FakeData(&a)
		if err != nil {
			return err
		}
		before := eC <= (fakegenConf.eventsCount / 2)
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
			Discoverable: true,
		}
		creatorRealmID := chain.UserRealmID(zUser.ID)
		uuid := uuid.New().String()
		evtID := strings.ReplaceAll(uuid, "-", "_")
		evtRealmID := chain.EventRealmID(evtID)
		if err := chain.CreateEvent(evtRealmID, []string{creatorRealmID}, []string{}, evtReq, nil); err != nil {
			return err
		}

		// Create posts/polls only for the last event (to avoid flooding the chain and db)
		if eC == fakegenConf.eventsCount-1 {
			logger.Info("creating posts")

			// Create StandardPosts
			pID := 1 // used only when chain creation is skipped
			for pC := range fakegenConf.postsCount {
				p := fakePost{}
				err := faker.FakeData(&p)
				if err != nil {
					return err
				}

				post := &feedsv1.Post{
					Author:    creatorRealmID,
					CreatedAt: startDate.Add(-time.Duration(pC) * time.Hour).Unix(), //One post per hour (FIXME: Doesn't work),
					Post: &feedsv1.Post_Standard{
						Standard: &feedsv1.StandardPost{
							Content: p.Content,
						},
					},
				}

				postID := fmt.Sprintf("%d", pID)
				entityRealmID, err := chain.EntityRealmID(zeni.EntityTypeEvent, evtRealmID)
				if err != nil {
					return fmt.Errorf("invalid org: %w", err)
				}
				postID, err = chain.CreatePost(creatorRealmID, entityRealmID, post)
				if err != nil {
					return err
				}

				// Create reactions only for the first post (to avoid flooding the chain and db)
				if pC == 0 {
					logger.Info("creating reactions")
					icons := []string{"😀", "🎉", "🔥", "💡", "🍕", "🌟", "🤖", "😎", "💀", "🚀", "🧠", "🛠️", "🎶", "🍀", "🎨", "🧸", "📚", "🕹️", "🏆", "🧬", "🧘", "🍩", "🥑", "📸", "🧃", "🎧", "🪐", "💬"}
					for rC := range len(icons) {
						// React to Posts
						reactReq := &zenaov1.ReactPostRequest{
							PostId: postID,
							Icon:   icons[rC],
						}
						if err = chain.ReactPost(creatorRealmID, reactReq); err != nil {
							return err
						}
					}
				}
				pID++
			}

			// Create Polls
			logger.Info("creating polls")
			poID := 1
			for range fakegenConf.pollsCount {
				p := fakePoll{}
				err := faker.FakeData(&p)
				if err != nil {
					return err
				}

				options := make([]string, p.OptionsCount)
				for oC := range p.OptionsCount {
					options[oC] = faker.UUIDDigit()
				}

				pollReq := &zenaov1.CreatePollRequest{
					OrgType:  zeni.EntityTypeEvent,
					OrgId:    evtID,
					Question: p.Question,
					Options:  options,
					Duration: int64(p.DaysDuration * 24 * 60 * 60),
					Kind:     pollsv1.PollKind(p.KindRaw),
				}

				pollID := fmt.Sprintf("%d", poID)
				entityRealmID, err := chain.EntityRealmID(pollReq.OrgType, pollReq.OrgId)
				if err != nil {
					return fmt.Errorf("invalid org: %w", err)
				}
				pollID, _, err = chain.CreatePoll(creatorRealmID, entityRealmID, pollReq)
				if err != nil {
					return err
				}

				//Vote on Polls
				voteReq := &zenaov1.VotePollRequest{
					PollId: pollID,
					Option: options[0],
				}
				if err = db.VotePoll(creatorRealmID, voteReq); err != nil {
					return err
				}
				if err = chain.VotePoll(creatorRealmID, voteReq); err != nil {
					return err
				}
				poID++
				pID++
			}
		}
	}

	logger.Info("creating communities")

	for range fakegenConf.communitiesCount {
		uuid := uuid.New().String()
		cmtID := strings.ReplaceAll(uuid, "-", "_")
		cmtRealmID := chain.EventRealmID(cmtID)
		c := fakeCommunity{}
		err := faker.FakeData(&c)
		if err != nil {
			return err
		}
		creatorRealmID := chain.UserRealmID(zUser.ID)

		communityReq := &zenaov1.CreateCommunityRequest{
			DisplayName:    c.Title,
			Description:    c.Description,
			AvatarUri:      randomPick(eventImages),
			BannerUri:      randomPick(eventImages),
			Administrators: []string{creatorRealmID},
		}

		if err = chain.CreateCommunity(cmtRealmID, []string{creatorRealmID}, []string{creatorRealmID}, []string{}, communityReq); err != nil {
			return err
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
