package main

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"connectrpc.com/authn"
	connectcors "connectrpc.com/cors"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/rs/cors"
	"github.com/samouraiworld/zenao/backend/zenao/v1/zenaov1connect"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	logger, err := zap.NewDevelopment()
	if err != nil {
		panic(err)
	}

	clerk.SetKey("sk_test_cZI9RwUcgLMfd6HPsQgX898hSthNjnNGKRcaVGvUCK")

	zenao := &ZenaoServer{Logger: logger}
	mux := http.NewServeMux()
	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao)
	mux.Handle(path, middlewares(handler,
		withRequestLogging(logger),
		withConnectCORS("*"),
		authn.NewMiddleware(authenticate).Wrap,
	))

	addr := "localhost:4242"
	logger.Info("Starting server", zap.String("addr", addr))
	http.ListenAndServe(
		addr,
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
			AllowedHeaders: append(connectcors.AllowedHeaders(), "Authorization"), // Authorization needed?
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

func authenticate(_ context.Context, req *http.Request) (any, error) {
	// Get the session JWT from the Authorization header
	sessionToken := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")

	// Verify the session
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
	fmt.Printf(`{"user_id": "%s", "user_banned": "%t"}`+"\n", usr.ID, usr.Banned)
	// The request is authenticated! We can propagate the authenticated user to
	// Connect interceptors and services by returning it: the middleware we're
	// about to construct will attach it to the context automatically.
	return usr, nil
}
