package main

import (
	"context"
	"encoding/json"
	"io"
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
	"github.com/stripe/stripe-go/v81"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

const (
	allowedOrigin  = "*"
	clerkSecretKey = "sk_test_cZI9RwUcgLMfd6HPsQgX898hSthNjnNGKRcaVGvUCK"
	bindAddr       = "localhost:4242"
)

func main() {
	logger, err := zap.NewDevelopment()
	if err != nil {
		panic(err)
	}

	mux := http.NewServeMux()

	// setup zenao service
	zenao := &ZenaoServer{
		Logger: logger,
		GetUser: func(ctx context.Context) ZenaoUser {
			clerkUser := authn.GetInfo(ctx).(*clerk.User)
			return ZenaoUser{ID: clerkUser.ID, Banned: clerkUser.Banned}
		},
	}
	path, handler := zenaov1connect.NewZenaoServiceHandler(zenao)
	mux.Handle(path, middlewares(handler,
		withRequestLogging(logger),
		withConnectCORS(allowedOrigin),
		withClerkAuth(clerkSecretKey),
	))

	// setup stripe webhook
	mux.Handle("/stripe-webhook", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		const MaxBodyBytes = int64(65536)
		req.Body = http.MaxBytesReader(w, req.Body, MaxBodyBytes)
		payload, err := io.ReadAll(req.Body)
		if err != nil {
			logger.Error("Error reading request body", zap.Error(err))
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}

		event := stripe.Event{}

		if err := json.Unmarshal(payload, &event); err != nil {
			logger.Error("Failed to parse webhook body json", zap.Error(err))
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		// Unmarshal the event data into an appropriate struct depending on its Type
		switch event.Type {
		case "payment_intent.succeeded":
			var paymentIntent stripe.PaymentIntent
			err := json.Unmarshal(event.Data.Raw, &paymentIntent)
			if err != nil {
				logger.Error("Error parsing webhook JSON", zap.Error(err))
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			// Then define and call a func to handle the successful payment intent.
			// handlePaymentIntentSucceeded(paymentIntent)
		case "payment_method.attached":
			var paymentMethod stripe.PaymentMethod
			err := json.Unmarshal(event.Data.Raw, &paymentMethod)
			if err != nil {
				logger.Error("Error parsing webhook JSON", zap.Error(err))
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			// Then define and call a func to handle the successful attachment of a PaymentMethod.
			// handlePaymentMethodAttached(paymentMethod)
		// ... handle other event types
		default:
			logger.Error("Unhandled event type", zap.String("type", string(event.Type)))
		}

		w.WriteHeader(http.StatusOK)
	}))

	logger.Info("Starting server", zap.String("addr", bindAddr))
	http.ListenAndServe(
		bindAddr,
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
