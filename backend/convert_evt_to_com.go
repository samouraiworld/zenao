package main

import (
	"context"
	"errors"
	"flag"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
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
	dbPath      string
	evtID       string
	displayName string
	description string
	avatarURI   string
	bannerURI   string
	verbose     bool
}

func (conf *EvtToComConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&evtToComConf.dbPath, "db-path", "dev.db", "Path to the database")
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
	logger.Info("converting an event to a community with args: ", zap.String("db-path", evtToComConf.dbPath), zap.String("evt-id", evtToComConf.evtID), zap.String("display-name", evtToComConf.displayName), zap.String("description", evtToComConf.description), zap.String("avatar-uri", evtToComConf.avatarURI), zap.String("banner-uri", evtToComConf.bannerURI), zap.Bool("verbose", evtToComConf.verbose))

	if evtToComConf.evtID == "" {
		return errors.New("evt-id is required")
	}
	db, err := gzdb.SetupDB(evtToComConf.dbPath)
	if err != nil {
		return err
	}
	logger.Info("database initialized")

	var cmt *zeni.Community
	var membersIDs []string
	var cmtReq *zenaov1.CreateCommunityRequest
	var evt *zeni.Event
	if err := db.Tx(func(tx zeni.DB) error {
		evt, err = tx.GetEvent(evtToComConf.evtID)
		if err != nil {
			return err
		}
		if evt == nil {
			return errors.New("event not found")
		}
		logger.Info("event found", zap.String("event-id", evt.ID), zap.String("title", evt.Title))

		cmtReq = &zenaov1.CreateCommunityRequest{
			DisplayName: evt.Title,
			Description: evt.Description,
			AvatarUri:   evt.ImageURI,
			BannerUri:   "",
		}
		if evtToComConf.displayName != "" {
			cmtReq.DisplayName = evtToComConf.displayName
		}
		if evtToComConf.description != "" {
			cmtReq.Description = evtToComConf.description
		}
		if evtToComConf.avatarURI != "" {
			cmtReq.AvatarUri = evtToComConf.avatarURI
		}
		if evtToComConf.bannerURI != "" {
			cmtReq.BannerUri = evtToComConf.bannerURI
		}
		logger.Info("creating community with request", zap.Any("request", cmtReq))

		users, err := tx.GetOrgUsers(zeni.EntityTypeEvent, evt.ID)
		if err != nil {
			return err
		}
		membersIDs = mapsl.Map(users, func(usr *zeni.User) string { return usr.ID })
		cmt, err = tx.CreateCommunity(evt.CreatorID, []string{evt.CreatorID}, membersIDs, []string{evt.ID}, cmtReq)
		if err != nil {
			return err
		}

		if _, err = tx.CreateFeed(zeni.EntityTypeCommunity, cmt.ID, "main"); err != nil {
			return err
		}
		return err
	}); err != nil {
		return err
	}

	logger.Info("community persisted successfully in the database")

	return nil
}
