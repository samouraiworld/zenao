package main

import (
	"context"
	"errors"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/go-faker/faker/v4"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"go.uber.org/zap"
)

func newFakegenCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "fakegen",
			ShortUsage: "fakegen",
			ShortHelp:  "generate fake data",
		},
		commands.NewEmptyConfig(),
		func(ctx context.Context, args []string) error {
			return execFakegen()
		},
	)
}

type fakeEvent struct {
	Title         string  `faker:"sentence"`
	Description   string  `faker:"paragraph"`
	TicketPrice   float64 `faker:"amount"`
	Capacity      float64 `faker:"amount"`
	StartDate     int64   `faker:"unix_time"`
	DurationHours int     `faker:"oneof: 1, 24, 72"`
}

func execFakegen() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	injectEnv()

	chain, err := setupChain(conf.adminMnemonic, conf.gnoNamespace, conf.chainID, conf.chainEndpoint, logger)
	if err != nil {
		return err
	}

	db, err := setupDB(conf.dbPath)
	if err != nil {
		return err
	}

	for range 20 {
		a := fakeEvent{}
		err := faker.FakeData(&a)
		if err != nil {
			return err
		}
		req := &zenaov1.CreateEventRequest{
			Title:       a.Title,
			Description: a.Description,
			ImageUri:    randomPick(eventImages),
			StartDate:   uint64(a.StartDate),
			EndDate:     uint64(time.Unix(a.StartDate, 0).Add(time.Duration(a.DurationHours) * time.Hour).Unix()),
			TicketPrice: a.TicketPrice,
			Capacity:    uint32(a.Capacity),
		}
		creatorID := "1"

		evtId, err := db.CreateEvent(creatorID, req)
		if err != nil {
			return err
		}

		if err := chain.CreateEvent(evtId, creatorID, req); err != nil {
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
