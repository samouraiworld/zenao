package main

import (
	"context"
	"errors"
	"flag"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/go-faker/faker/v4"
	"github.com/samouraiworld/zenao/backend/gzdb"
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
}

func (conf *fakegenConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&fakegenConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&fakegenConf.chainEndpoint, "chain-endpoint", "127.0.0.1:26657", "Gno rpc address")
	flset.StringVar(&fakegenConf.gnoNamespace, "gno-namespace", "zenao", "Gno namespace")
	flset.StringVar(&fakegenConf.chainID, "gno-chain-id", "dev", "Gno chain ID")
	flset.StringVar(&fakegenConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.UintVar(&fakegenConf.eventsCount, "events", 20, "number of fake events to generate")
}

type fakeEvent struct {
	Title            string  `faker:"sentence"`
	Description      string  `faker:"paragraph"`
	TicketPrice      float64 `faker:"amount"`
	Capacity         float64 `faker:"boundary_start=10, boundary_end=5000"`
	StartOffsetHours int     `faker:"oneof: 24, 48, 72, 96"`
	DurationHours    int     `faker:"oneof: 1, 6, 12"`
	Location         string  `faker:"sentence"`
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

	userId, err := db.CreateUser("user_2tYwvgu86EutANd5FUalvHvHm05") // alice+clerk_test@example.com
	if err != nil {
		return err
	}

	if err := chain.CreateUser(&zeni.User{ID: userId}); err != nil {
		return err
	}

	for i := range fakegenConf.eventsCount {
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
		req := &zenaov1.CreateEventRequest{
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
		creatorID := userId

		evt, err := db.CreateEvent(creatorID, req)
		if err != nil {
			return err
		}

		if err := chain.CreateEvent(evt.ID, creatorID, req); err != nil {
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
