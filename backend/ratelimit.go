package main

import (
	"context"
	"net"
	"sync"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/time/rate"
)

// rateLimitEntry tracks the limiter and last-seen time for a given key (IP address).
type rateLimitEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter provides per-IP rate limiting for ConnectRPC endpoints.
type RateLimiter struct {
	mu       sync.Mutex
	entries  map[string]*rateLimitEntry
	rate     rate.Limit
	burst    int
	cleanTTL time.Duration
}

// NewRateLimiter creates a rate limiter that allows 'r' requests per second
// with a burst capacity of 'b' per unique IP address.
// Stale entries are cleaned up after 'cleanTTL'.
func NewRateLimiter(r rate.Limit, b int, cleanTTL time.Duration) *RateLimiter {
	rl := &RateLimiter{
		entries:  make(map[string]*rateLimitEntry),
		rate:     r,
		burst:    b,
		cleanTTL: cleanTTL,
	}

	// Background cleanup of stale rate limit entries
	go func() {
		ticker := time.NewTicker(cleanTTL)
		defer ticker.Stop()
		for range ticker.C {
			rl.cleanup()
		}
	}()

	return rl
}

// getLimiter returns or creates a rate limiter for the given key.
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, exists := rl.entries[key]
	if !exists {
		entry = &rateLimitEntry{
			limiter: rate.NewLimiter(rl.rate, rl.burst),
		}
		rl.entries[key] = entry
	}
	entry.lastSeen = time.Now()
	return entry.limiter
}

// cleanup removes entries that haven't been seen in cleanTTL.
func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	cutoff := time.Now().Add(-rl.cleanTTL)
	for key, entry := range rl.entries {
		if entry.lastSeen.Before(cutoff) {
			delete(rl.entries, key)
		}
	}
}

// extractIP extracts the IP address from the ConnectRPC peer address.
// Falls back to the raw address if parsing fails.
func extractIP(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	return host
}

// NewRateLimitInterceptor creates a ConnectRPC unary interceptor that enforces
// per-IP rate limiting. Requests exceeding the limit receive a ResourceExhausted error.
func NewRateLimitInterceptor(limiter *RateLimiter) connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			// Skip rate limiting for health checks
			if req.Spec().Procedure == "/zenao.v1.ZenaoService/Health" {
				return next(ctx, req)
			}

			ip := extractIP(req.Peer().Addr)
			if !limiter.getLimiter(ip).Allow() {
				return nil, connect.NewError(
					connect.CodeResourceExhausted,
					nil,
				)
			}

			return next(ctx, req)
		})
	}
	return connect.UnaryInterceptorFunc(interceptor)
}
