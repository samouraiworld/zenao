package main

import (
	"net/http"
	"slices"

	connectcors "connectrpc.com/cors"
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

	zenao := &ZenaoServer{}
	mux := http.NewServeMux()
	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao)
	mux.Handle(path, middlewares(handler,
		withRequestLogging(logger),
		withConnectCORS("*"),
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
			AllowedHeaders: connectcors.AllowedHeaders(),
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
