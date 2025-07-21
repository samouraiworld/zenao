package main

import (
	"context"
	"errors"
	"flag"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/tm2/pkg/commands"
	communitiesv1 "github.com/samouraiworld/zenao/backend/communities/v1"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/mapsl"
	"github.com/samouraiworld/zenao/backend/zeni"
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
	chain := &gnoZenaoChain{
		signerInfo: signerInfo,
		logger:     logger,
		namespace:  evtToComConf.chainNamespace,
	}
	logger.Info("Signer initialized", zap.String("address", signerInfo.GetAddress().String()))

	db, err := gzdb.SetupDB(evtToComConf.dbPath)
	if err != nil {
		return err
	}
	logger.Info("database initialized")

	var cmt *zeni.Community
	var membersIDs []string
	var cmtReq *communitiesv1.CreateCommunityRequest
	if err := db.Tx(func(tx zeni.DB) error {
		evt, err := tx.GetEvent(evtToComConf.evtID)
		if err != nil {
			return err
		}
		if evt == nil {
			return errors.New("event not found")
		}
		logger.Info("event found", zap.String("event-id", evt.ID), zap.String("title", evt.Title))

		cmtReq = &communitiesv1.CreateCommunityRequest{
			DisplayName: evt.Title,
			Description: evt.Description,
			AvatarURI:   evt.ImageURI,
			BannerURI:   "",
		}
		if evtToComConf.displayName != "" {
			cmtReq.DisplayName = evtToComConf.displayName
		}
		if evtToComConf.description != "" {
			cmtReq.Description = evtToComConf.description
		}
		if evtToComConf.avatarURI != "" {
			cmtReq.AvatarURI = evtToComConf.avatarURI
		}
		if evtToComConf.bannerURI != "" {
			cmtReq.BannerURI = evtToComConf.bannerURI
		}
		logger.Info("creating community with request", zap.Any("request", cmtReq))

		organizersIDs, err := tx.GetEventUsersWithRole(evt.ID, "organizer")
		if err != nil {
			return err
		}
		gkpsIDs, err := tx.GetEventUsersWithRole(evt.ID, "gatekeeper")
		if err != nil {
			return err
		}
		participantIDs, err := tx.GetEventUsersWithRole(evt.ID, "participant")
		if err != nil {
			return err
		}
		membersIDs = mapsl.Map(organizersIDs, func(usr *zeni.User) string { return usr.ID })
		membersIDs = append(membersIDs, mapsl.Map(gkpsIDs, func(usr *zeni.User) string { return usr.ID })...)
		membersIDs = append(membersIDs, mapsl.Map(participantIDs, func(usr *zeni.User) string { return usr.ID })...)

		cmt, err = tx.CreateCommunity(evt.CreatorID, []string{}, membersIDs, cmtReq)
		return err
	}); err != nil {
		return err
	}

	logger.Info("community persisted successfully in the database")

	err = chain.CreateCommunity(cmt.ID, cmt.CreatorID, []string{}, membersIDs, cmtReq)
	if err != nil {
		return err
	}
	logger.Info("community created on the chain", zap.String("community-pkg-path", chain.communityPkgPath(cmt.ID)))

	return nil
}
