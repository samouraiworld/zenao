package main

import (
	"context"
	"crypto"
	"crypto/ed25519"
	srand "crypto/rand"
	_ "embed"
	"encoding/base64"
	"flag"
	"strings"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type initSecretsConfig struct {
	dbPath string
}

func (conf *initSecretsConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
}

func newInitSecretsCmd() *commands.Command {
	var conf initSecretsConfig
	return commands.NewCommand(
		commands.Metadata{
			Name:       "init-secrets",
			ShortUsage: "init-secrets",
			ShortHelp:  "populate secrets",
		},
		&conf,
		func(ctx context.Context, args []string) error {
			return execInitSecrets(&conf)
		},
	)
}

func execInitSecrets(conf *initSecretsConfig) error {
	var (
		db  *gorm.DB
		err error
	)

	dsn := conf.dbPath
	if strings.HasPrefix(dsn, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        dsn,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	}
	if err != nil {
		return err
	}

	for {
		var tickets []*gzdb.SoldTicket
		if err := db.Model(&gzdb.SoldTicket{}).Where("secret = ?", nil).Limit(1).Find(&tickets).Error; err != nil {
			return err
		}
		if len(tickets) == 0 {
			return nil
		}
		dbTicket := tickets[0]
		ticket, err := NewTicket()
		if err != nil {
			continue
		}
		dbTicket.Secret = ticket.Secret()
		if err := db.Save(dbTicket).Error; err != nil {
			continue
		}
	}
}

type Ticket struct {
	sk ed25519.PrivateKey
}

func (t *Ticket) Secret() string {
	return base64.RawURLEncoding.EncodeToString(t.sk.Seed())
}

func (t *Ticket) Pubkey() string {
	pk := t.sk.Public().(ed25519.PublicKey)
	return base64.RawURLEncoding.EncodeToString(pk)
}

func (t *Ticket) Signature(gatekeeper string) (string, error) {
	signature, err := t.sk.Sign(srand.Reader, []byte(gatekeeper), crypto.Hash(0))
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(signature), nil
}

func NewTicket() (*Ticket, error) {
	secret := make([]byte, ed25519.SeedSize)
	if _, err := srand.Read(secret); err != nil {
		return nil, err
	}
	return &Ticket{sk: ed25519.NewKeyFromSeed(secret)}, nil
}
