package main

import (
	"context"
	"errors"
	"flag"
	"net/http"
	"os"
	"slices"
	"strings"

	"connectrpc.com/connect"
	connectcors "connectrpc.com/cors"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/resend/resend-go/v2"
	"github.com/rs/cors"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/samouraiworld/zenao/backend/czauth"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zenao/v1/zenaov1connect"
)

func main() {
	cmd := commands.NewCommand(
		commands.Metadata{
			ShortUsage: "<subcommand> [flags] [<arg>...]",
			LongHelp:   "zenao backend server and tools",
		},
		commands.NewEmptyConfig(),
		commands.HelpExec,
	)

	cmd.AddSubCommands(
		newStartCmd(),
		newFakegenCmd(),
		newMailCmd(),
		newPromoteUserCmd(),
		newRealmsrcCmd(),
		newE2EInfraCmd(),
		newGenticketCmd(),
		newGenPdfTicketCmd(),
		newGenTxsCmd(),
	)

	cmd.Execute(context.Background(), os.Args[1:])
}

type config struct {
	allowedOrigins  string
	clerkSecretKey  string
	bindAddr        string
	adminMnemonic   string
	gnoNamespace    string
	chainEndpoint   string
	chainID         string
	dbPath          string
	resendSecretKey string
	discordtoken    string
	gasSecurityRate float64
	maintenance     bool
}

func (conf *config) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.allowedOrigins, "allowed-origins", "*", "CORS allowed origin")
	flset.StringVar(&conf.clerkSecretKey, "clerk-secret-key", "sk_test_cZI9RwUcgLMfd6HPsQgX898hSthNjnNGKRcaVGvUCK", "Clerk secret key")
	flset.StringVar(&conf.bindAddr, "bind-addr", "localhost:4242", "Address to bind to")
	flset.StringVar(&conf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&conf.chainEndpoint, "chain-endpoint", "127.0.0.1:26657", "Gno rpc address")
	flset.StringVar(&conf.gnoNamespace, "gno-namespace", "zenao", "Gno namespace")
	flset.StringVar(&conf.chainID, "gno-chain-id", "dev", "Gno chain ID")
	flset.StringVar(&conf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.StringVar(&conf.resendSecretKey, "resend-secret-key", "", "Resend secret key")
	flset.StringVar(&conf.discordtoken, "discord-token", "", "Discord Token")
	flset.Float64Var(&conf.gasSecurityRate, "gas-security-rate", 0.2, "margin multiplier for estimated gas wanted to be safe")
	flset.BoolVar(&conf.maintenance, "maintenance", false, "Maintenance mode, disable all API calls except healthcheck")
}

var conf config

func newStartCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "start",
			ShortUsage: "start",
			ShortHelp:  "start the server",
		},
		&conf,
		func(ctx context.Context, args []string) error {
			return execStart()
		},
	)
}

func injectStartEnv() {
	mappings := map[string]*string{
		"ZENAO_ADMIN_MNEMONIC":    &conf.adminMnemonic,
		"ZENAO_RESEND_SECRET_KEY": &conf.resendSecretKey,
		"ZENAO_CLERK_SECRET_KEY":  &conf.clerkSecretKey,
		"ZENAO_DB":                &conf.dbPath,
		"ZENAO_CHAIN_ENDPOINT":    &conf.chainEndpoint,
		"ZENAO_ALLOWED_ORIGINS":   &conf.allowedOrigins,
		"DISCORD_TOKEN":           &conf.discordtoken,
	}

	for key, ps := range mappings {
		val := os.Getenv(key)
		if val != "" {
			*ps = val
		}
	}

}

func execStart() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	injectStartEnv()

	auth, err := czauth.SetupAuth(conf.clerkSecretKey)
	if err != nil {
		return err
	}

	chain, err := setupChain(conf.adminMnemonic, conf.gnoNamespace, conf.chainID, conf.chainEndpoint, conf.gasSecurityRate, logger)
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(conf.dbPath)
	if err != nil {
		return err
	}

	err = RegisterMultiAddrProtocols()
	if err != nil {
		return err
	}

	mux := http.NewServeMux()

	mailClient := (*resend.Client)(nil)
	if conf.resendSecretKey != "" {
		logger.Info("resend mail client initialized")
		mailClient = resend.NewClient(conf.resendSecretKey)
	}

	zenao := &ZenaoServer{
		Logger:       logger,
		Auth:         auth,
		Chain:        chain,
		DB:           db,
		MailClient:   mailClient,
		DiscordToken: conf.discordtoken,
		Maintenance:  conf.maintenance,
	}

	allowedOrigins := strings.Split(conf.allowedOrigins, ",")

	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao,
		connect.WithInterceptors(
			NewLoggingInterceptor(logger),
			NewMaintenanceInterceptor(conf.maintenance),
		),
	)
	mux.Handle(path, middlewares(handler,
		withConnectCORS(allowedOrigins...),
		auth.WithAuth(),
	))

	logger.Info("Starting server", zap.String("addr", conf.bindAddr))

	return http.ListenAndServe(
		conf.bindAddr,
		// Use h2c so we can serve HTTP/2 without TLS.
		h2c.NewHandler(mux, &http2.Server{}),
	)
}

func middlewares(base http.Handler, ms ...func(http.Handler) http.Handler) http.Handler {
	res := base
	rms := ms[:]
	slices.Reverse(rms)
	for _, m := range rms {
		res = m(res)
	}
	return res
}

func withConnectCORS(allowedOrigins ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		middleware := cors.New(cors.Options{
			AllowedOrigins: allowedOrigins,
			AllowedMethods: connectcors.AllowedMethods(),
			AllowedHeaders: append(connectcors.AllowedHeaders(), "Authorization"),
			ExposedHeaders: connectcors.ExposedHeaders(),
		})
		return middleware.Handler(next)
	}
}

func NewMaintenanceInterceptor(maintenance bool) connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			if maintenance && req.Spec().Procedure != "/zenao.v1.ZenaoService/Health" {
				return nil, connect.NewError(connect.CodeUnavailable, errors.New("service is under maintenance, try again in few minutes..."))
			}
			return next(ctx, req)
		})
	}
	return connect.UnaryInterceptorFunc(interceptor)
}

func NewLoggingInterceptor(logger *zap.Logger) connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			logger.Info(req.Spec().Procedure, zap.Any("payload", req.Any()), zap.Any("peer", req.Peer()))
			res, err := next(ctx, req)
			if err != nil {
				logger.Error(req.Spec().Procedure, zap.Any("payload", req.Any()), zap.Any("peer", req.Peer()), zap.Error(err))
			}
			return res, err
		})
	}
	return connect.UnaryInterceptorFunc(interceptor)
}
