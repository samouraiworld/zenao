package main

import (
	"context"
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

	chain, err := setupChain(adminMnemonic, eventsIndexPkgPath, chainID, chainEndpoint, logger)
	if err != nil {
		return err
	}

	db, err := setupLocalDB(dbPath)
	if err != nil {
		return err
	}

	for range 50 {
		a := fakeEvent{}
		err := faker.FakeData(&a)
		if err != nil {
			return err
		}
		req := &zenaov1.CreateEventRequest{
			Title:       a.Title,
			Description: a.Description,
			ImageUri:    "http://loremflickr.com/800/800",
			StartDate:   uint64(a.StartDate),
			EndDate:     uint64(time.Unix(a.StartDate, 0).Add(time.Duration(a.DurationHours) * time.Hour).Unix()),
			TicketPrice: a.TicketPrice,
			Capacity:    uint32(a.Capacity),
		}
		creatorID := "user_alice"

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
