package main

import (
	"net/http"

	connectcors "connectrpc.com/cors"
	"github.com/rs/cors"
	"github.com/samouraiworld/zenao/backend/zenao/v1/zenaov1connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	zenao := &ZenaoServer{}
	mux := http.NewServeMux()
	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao)
	mux.Handle(path, withCORS(handler))
	http.ListenAndServe(
		"localhost:4242",
		// Use h2c so we can serve HTTP/2 without TLS.
		h2c.NewHandler(mux, &http2.Server{}),
	)
}

func withCORS(h http.Handler) http.Handler {
	middleware := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: connectcors.AllowedMethods(),
		AllowedHeaders: connectcors.AllowedHeaders(),
		ExposedHeaders: connectcors.ExposedHeaders(),
	})
	return middleware.Handler(h)
}
