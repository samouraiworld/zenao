package main

import (
	"context"
	"errors"
	"flag"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"go.uber.org/zap"
)

func newConvertEvtToComCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "convert-evt-to-com",
			ShortUsage: "convert-evt-to-com <event-id>",
			ShortHelp:  "Convert an event to a community",
		},
		&evtToComConf,
		func(ctx context.Context, args []string) error {
			return convertEvtToCom()
		},
	)
}

var evtToComConf EvtToComConfig

type EvtToComConfig struct {
	adminMnemonic  string
	chainId        string
	chainNamespace string
	dbPath         string
	evtID          string
	displayName    string
	description    string
	avatarURI      string
	bannerURI      string
	verbose        bool
}

func (conf *EvtToComConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&evtToComConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&evtToComConf.chainId, "chain-id", "", "Chain ID")
	flset.StringVar(&evtToComConf.chainNamespace, "chain-namespace", "zenao", "Namespace used to deploy pkg on the chain")
	flset.StringVar(&evtToComConf.dbPath, "db-path", "", "Path to the database")
	flset.StringVar(&evtToComConf.evtID, "evt-id", "", "ID of the event to convert")
	flset.StringVar(&evtToComConf.displayName, "display-name", "", "Display name for the new community")
	flset.StringVar(&evtToComConf.description, "description", "", "Description for the new community")
	flset.StringVar(&evtToComConf.avatarURI, "avatar-uri", "", "Avatar URI for the new community")
	flset.StringVar(&evtToComConf.bannerURI, "banner-uri", "", "Banner URI for the new community")
	flset.BoolVar(&evtToComConf.verbose, "v", false, "Enable verbose logging")
}

func convertEvtToCom() error {
	logger := zap.NewNop()
	if evtToComConf.verbose {
		var err error
		logger, err = zap.NewDevelopment()
		if err != nil {
			return err
		}
	}
	logger.Info("converting an event to a community with args: ", zap.String("chain-id", evtToComConf.chainId), zap.String("db-path", evtToComConf.dbPath), zap.String("evt-id", evtToComConf.evtID), zap.String("display-name", evtToComConf.displayName), zap.String("description", evtToComConf.description), zap.String("avatar-uri", evtToComConf.avatarURI), zap.String("banner-uri", evtToComConf.bannerURI))

	signer, err := gnoclient.SignerFromBip39(evtToComConf.adminMnemonic, "dev", "", 0, 0)
	if err != nil {
		return err
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return err
	}
	signerFromKeybase, ok := signer.(*gnoclient.SignerFromKeybase)
	if !ok {
		return errors.New("signer is not a SignerFromKeybase")
	}
	_, err = signerFromKeybase.Keybase.ExportPrivKey(signerInfo.GetName(), "")
	if err != nil {
		return err
	}

	_ = &gnoZenaoChain{
		signerInfo: signerInfo,
		logger:     logger,
		namespace:  evtToComConf.chainNamespace,
	}
	logger.Info("Signer initialized", zap.String("address", signerInfo.GetAddress().String()))

	_, err = gzdb.SetupDB(evtToComConf.dbPath)
	if err != nil {
		return err
	}
	logger.Info("database initialized")

	// 1. Get event
	// 2. build Community

	return nil
}
