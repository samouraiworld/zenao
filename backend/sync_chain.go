package main

import (
	"context"
	"flag"
	"fmt"

	"github.com/gnolang/gno/tm2/pkg/commands"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
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

	db, err := setupDB(syncChainConf.dbPath)
	if err != nil {
		return err
	}

	users := []*User{}
	if err := db.db.Find(&users).Error; err != nil {
		return err
	}
	for _, user := range users {
		if err := chain.CreateUser(fmt.Sprintf("%d", user.ID)); err != nil {
			logger.Error("failed to create user", zap.Uint("user-id", user.ID), zap.Error(err))
		}
	}

	events := []*Event{}
	if err := db.db.Find(&events).Error; err != nil {
		return err
	}
	for _, event := range events {
		if err := chain.CreateEvent(fmt.Sprintf("%d", event.ID), fmt.Sprintf("%d", event.CreatorID), &zenaov1.CreateEventRequest{
			Title:       event.Title,
			Description: event.Description,
			ImageUri:    event.ImageURI,
			StartDate:   uint64(event.StartDate.Unix()),
			EndDate:     uint64(event.EndDate.Unix()),
			TicketPrice: event.TicketPrice,
			Capacity:    event.Capacity,
			Location:    event.Location,
		}); err != nil {
			logger.Error("failed to create event", zap.Uint("event-id", event.ID), zap.Error(err))
		}
	}

	tickets := []*SoldTicket{}
	if err := db.db.Find(&tickets).Error; err != nil {
		return err
	}
	for _, ticket := range tickets {
		if err := chain.Participate(fmt.Sprintf("%d", ticket.EventID), ticket.UserID); err != nil {
			logger.Error("failed to add participation", zap.Uint("event-id", ticket.EventID), zap.String("user-id", ticket.UserID), zap.Error(err))
		}
	}

	return nil
}
