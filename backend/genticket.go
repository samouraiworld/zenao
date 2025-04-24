package main

import (
	"context"
	"crypto/ed25519"
	srand "crypto/rand"
	_ "embed"
	"flag"
	"fmt"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/zeni"
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

	ticket, err := zeni.NewTicket()
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
