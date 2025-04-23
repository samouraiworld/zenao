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

	sk := ed25519.NewKeyFromSeed(secret)
	fmt.Printf("🌱 Seed:\n%s\n", base64.RawURLEncoding.EncodeToString(sk.Seed()))

	pk := sk.Public().(ed25519.PublicKey)
	fmt.Printf("🎫 Ticket pubkey:\n%s\n", base64.RawURLEncoding.EncodeToString(pk))

	if genticketConf.gatekeeper != "" {
		signature, err := sk.Sign(srand.Reader, []byte(genticketConf.gatekeeper), crypto.Hash(0))
		if err != nil {
			return err
		}
		b64Sig := base64.RawURLEncoding.EncodeToString(signature)

		fmt.Printf("🚪 Checkin signature for gatekeeper %q:\n%s\n", genticketConf.gatekeeper, b64Sig)
	}

	return nil
}
