package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

func newPromoteUserCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "promote-user",
			ShortUsage: "promote-user",
			ShortHelp:  "promote a user to different plans (free, pro, ...etc)",
		},
		&promoteUserConf,
		func(ctx context.Context, args []string) error {
			return promoteUser()
		},
	)
}

var promoteUserConf = promoteUserConfig{
	plan: zeni.ProPlan,
}

type promoteUserConfig struct {
	email          string
	clerkID        string
	dbPath         string
	clerkSecretKey string
	plan           zeni.Plan
}

func (conf *promoteUserConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&promoteUserConf.email, "email", "", "the email of the user to promote")
	flset.StringVar(&promoteUserConf.clerkID, "clerkID", "", "the clerk id of the user to promote")
	flset.StringVar(&promoteUserConf.dbPath, "db", "dev.db", "the path to the database")
	flset.StringVar(&promoteUserConf.clerkSecretKey, "clerk-secret-key", "", "Clerk secret key")
	flset.Var(&promoteUserConf.plan, "plan", "plan to promote the user: pro (default) or free")
}

func promoteUser() error {
	if (promoteUserConf.email == "") == (promoteUserConf.clerkID == "") {
		if promoteUserConf.email == "" {
			return fmt.Errorf("either -email or -clerkID must be provided")
		} else {
			return fmt.Errorf("only one of -email or -clerkID should be provided, not both")
		}
	}

	mappings := map[string]*string{
		"ZENAO_CLERK_SECRET_KEY": &promoteUserConf.clerkSecretKey,
		"ZENAO_DB":               &promoteUserConf.dbPath,
	}

	for key, ps := range mappings {
		val := os.Getenv(key)
		if val != "" {
			*ps = val
		}
	}

	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(promoteUserConf.dbPath)
	if err != nil {
		return err
	}
	logger.Info("database initialized successfully")

	if promoteUserConf.email != "" {
		logger.Info("fetching clerk user id from email", zap.String("email", promoteUserConf.email))
		if promoteUserConf.clerkSecretKey == "" {
			return fmt.Errorf("-clerk-secret-key is required when using -email")
		}
		ctx := context.Background()
		clerk.SetKey(promoteUserConf.clerkSecretKey)
		list, err := user.List(ctx, &user.ListParams{EmailAddresses: []string{promoteUserConf.email}})
		if err != nil {
			return err
		}
		if len(list.Users) < 1 {
			return fmt.Errorf("user with email %s not found", promoteUserConf.email)
		}
		promoteUserConf.clerkID = list.Users[0].ID
		logger.Info("clerk user id fetched", zap.String("clerk-id", promoteUserConf.clerkID))
	}

	if err := db.Tx(func(txdb zeni.DB) error {
		logger.Info("fetching user from database", zap.String("clerk-id", promoteUserConf.clerkID))
		user, err := txdb.GetUserByAuthID(promoteUserConf.clerkID)
		if err != nil {
			return err
		}
		if user == nil {
			return errors.New("the user does not exist in database")
		}

		logger.Info("promoting user", zap.String("user-id", user.ID), zap.String("plan", string(promoteUserConf.plan)))
		if err = txdb.PromoteUser(user.ID, promoteUserConf.plan); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	logger.Info("user promoted", zap.String("clerk-id", promoteUserConf.clerkID), zap.String("plan", string(promoteUserConf.plan)))
	return nil
}
