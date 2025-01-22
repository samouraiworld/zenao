package main

import (
	"context"
	"net/http"
	"os"
	"slices"
	"strings"

	"connectrpc.com/authn"
	connectcors "connectrpc.com/cors"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/resend/resend-go/v2"
	"github.com/rs/cors"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/samouraiworld/zenao/backend/zenao/v1/zenaov1connect"
)

const (
	allowedOrigin      = "*"
	clerkSecretKey     = "sk_test_cZI9RwUcgLMfd6HPsQgX898hSthNjnNGKRcaVGvUCK"
	bindAddr           = "localhost:4242"
	adminMnemonic      = "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique"
	eventsIndexPkgPath = "gno.land/r/zenao/events_reg"
	chainEndpoint      = "127.0.0.1:26657"
	chainID            = "dev"
	dbPath             = "dev.db"
	resendSecretKey    = "re_fj3PNvR6_Pu8PsJEHVZdV8o1xPj6qe1HE" // be very careful with this key, it allows to send mail from zenao.io
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
	)

	cmd.Execute(context.Background(), os.Args[1:])
}

func newStartCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "start",
			ShortUsage: "start",
			ShortHelp:  "start the server",
		},
		commands.NewEmptyConfig(),
		func(ctx context.Context, args []string) error {
			return execStart()
		},
	)
}

func execStart() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	chain, err := setupChain(adminMnemonic, eventsIndexPkgPath, chainID, chainEndpoint, logger)
	if err != nil {
		return err
	}

	db, err := setupLocalDB(dbPath)
	if err != nil {
		return err
	}

	mux := http.NewServeMux()

	zenao := &ZenaoServer{
		Logger:     logger,
		GetUser:    getUserFromClerk,
		DBTx:       db.Tx,
		Chain:      chain,
		MailClient: resend.NewClient(resendSecretKey),
	}
	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao)
	mux.Handle(path, middlewares(handler,
		withRequestLogging(logger),
		withConnectCORS(allowedOrigin),
		withClerkAuth(clerkSecretKey),
	))

	logger.Info("Starting server", zap.String("addr", bindAddr))

	return http.ListenAndServe(
		bindAddr,
		// Use h2c so we can serve HTTP/2 without TLS.
		h2c.NewHandler(mux, &http2.Server{}),
	)
}

func getUserFromClerk(ctx context.Context) ZenaoUser {
	clerkUser := authn.GetInfo(ctx).(*clerk.User)
	email := ""
	if len(clerkUser.EmailAddresses) != 0 {
		email = clerkUser.EmailAddresses[0].EmailAddress
	}
	return ZenaoUser{ID: clerkUser.ID, Banned: clerkUser.Banned, Email: email}
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

func withRequestLogging(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			logger.Info("Request",
				zap.String("method", r.Method),
				zap.String("path", r.RequestURI),
				zap.String("host", r.Host),
			)
			next.ServeHTTP(w, r)
		})
	}
}

func withClerkAuth(secretKey string) func(http.Handler) http.Handler {
	clerk.SetKey(secretKey)
	return authn.NewMiddleware(func(_ context.Context, req *http.Request) (any, error) {
		sessionToken := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")

		claims, err := jwt.Verify(req.Context(), &jwt.VerifyParams{
			Token: sessionToken,
		})
		if err != nil {
			return nil, err
		}

		usr, err := user.Get(req.Context(), claims.Subject)
		if err != nil {
			return nil, err
		}
		return usr, nil
	}).Wrap
}
