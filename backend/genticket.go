package main

import (
	"context"
	"crypto"
	"crypto/ed25519"
	srand "crypto/rand"
	_ "embed"
	"encoding/base64"
	"flag"
	"fmt"

	"github.com/gnolang/gno/tm2/pkg/commands"
)

type genticketConfig struct {
	gatekeeper string
}

func (conf *genticketConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.gatekeeper, "gatekeeper", "", "Gatekeeper address used to pregenerate a signature")
}

func newGenticketCmd() *commands.Command {
	var genticketConf genticketConfig
	return commands.NewCommand(
		commands.Metadata{
			Name:       "genticket",
			ShortUsage: "genticket",
			ShortHelp:  "generate a ticket and signature if a gatekeeper address is provided",
		},
		&genticketConf,
		func(ctx context.Context, args []string) error {
			return execGenticket(&genticketConf)
		},
	)
}

func execGenticket(genticketConf *genticketConfig) error {
	secret := make([]byte, ed25519.SeedSize)
	if _, err := srand.Read(secret); err != nil {
		return err
	}

	ticket, err := NewTicket()
	if err != nil {
		return err
	}

	fmt.Printf("🌱 Seed:\n%s\n", ticket.Secret())

	fmt.Printf("🎫 Ticket pubkey:\n%s\n", ticket.Pubkey())

	if genticketConf.gatekeeper != "" {
		signature, err := ticket.Signature(genticketConf.gatekeeper)
		if err != nil {
			return err
		}
		fmt.Printf("🚪 Checkin signature for gatekeeper %q:\n%s\n", genticketConf.gatekeeper, signature)
	}

	return nil
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
