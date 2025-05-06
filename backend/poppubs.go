package main

import (
	"context"
	_ "embed"
	"flag"
	"fmt"
	"strings"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type poppubsConf struct {
	dbPath string
}

func (conf *poppubsConf) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
}

func newPoppubsCmd() *commands.Command {
	conf := &poppubsConf{}
	return commands.NewCommand(
		commands.Metadata{
			Name:       "poppubs",
			ShortUsage: "poppubs",
			ShortHelp:  "populate missing tickets pubkeys",
		},
		conf,
		func(ctx context.Context, args []string) error {
			return execPoppubs(conf)
		},
	)
}

func execPoppubs(conf *poppubsConf) error {
	var (
		db  *gorm.DB
		err error
	)

	if strings.HasPrefix(conf.dbPath, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        conf.dbPath,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(conf.dbPath), &gorm.Config{})
	}
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		var ticketsWithoutPubkey []*gzdb.SoldTicket
		if err := db.Where("pubkey = ?", "").Find(&ticketsWithoutPubkey).Error; err != nil {
			return err
		}

		for _, ticket := range ticketsWithoutPubkey {
			tick, err := zeni.NewTicketFromSecret(ticket.Secret)
			if err != nil {
				fmt.Println(err)
				continue
			}
			ticket.Pubkey = tick.Pubkey()
		}

		if err := db.Save(ticketsWithoutPubkey).Error; err != nil {
			return err
		}

		return nil
	})
}
