# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — Security, Build & CI Hardening

### Fixed
- **Critical CVE**: Upgrade Next.js 15.5.7 → 15.5.12 (RCE, source exposure, DoS)
- **npm audit fix**: Resolved 15 dependency vulnerabilities (Sentry, axios, minimatch, rollup, webpack, etc.)
- **Build resilience**: Root layout Health check wrapped in try-catch (build no longer requires running backend)
- **SEOBOT fallback**: Blog pages gracefully degrade when `SEOBOT_API_KEY` is unset
- **ConnectRPC transport**: Default `baseUrl` to `localhost:4242` (prevents invalid relative URL at build time)
- **Dashboard SSR**: Added `force-dynamic` to dashboard layout (auth pages require runtime rendering)

### CI/CD
- **Makefile**: Added missing `install-atlas` target (direct binary download to `$GOPATH/bin`)
- **Atlas installer**: Switched from `go install` (broken with Go 1.24) to official binary download
- **Cache keys**: Updated CI cache keys for atlas binary in `schema.yml` and `deploy-staging.yml`
- **Proto regen**: Fixed import ordering in generated ConnectRPC code
- **go mod tidy**: Cleaned stale `alecthomas/kong` entries from `go.sum`
- **gofmt**: Fixed struct field alignment in backend files

### Staging Deployment
- Manual migration `20260116120000_orders_ticketing` via Turso shell (FK constraint workaround for libsql)
- Migration `20260121190000_ticket_issue_status` applied automatically by Atlas
- Deploy workflow `22489738311` — **SUCCESS** (maintenance → backup → migrate → rebuild)

---

## [Unreleased] — Paid Events v1

### Added — Phase 2: Ticket Purchase (PR #1025)
- Stripe checkout integration with idempotency keys (`SetIdempotencyKey(checkout-session.order.<id>)`)
- Order state machine: `pending → paid → fulfilled` with atomic `UpdateOrderConfirmationOnce`
- Ticket issuance with deduplication (`ON CONFLICT DO NOTHING`) and concurrency safety
- Ticket hold system with capacity control (sold count + active holds vs capacity)
- Hold cleanup (`DeleteExpiredTicketHolds`) before capacity checks
- Failure rollback via `failOrderAndReleaseHolds` on Stripe errors
- Error truncation (`trimTicketIssueError`) capping at 1000 chars
- User orders listing with UI (`/dashboard/orders`)
- Order details page with buyer-only access control
- 30 Go unit tests covering payment confirmation, ticket issuance, idempotency, and concurrency

### Added — Phase 1: Price Listing (PR #1010)
- Price groups and prices DB schema with Atlas migrations
- Event price edition in dashboard with Stripe onboarding guard
- `validatePriceGroups()` — rejects negative amounts, validates `IsSupportedStripeCurrency`
- Community requirement enforcement for paid events
- `AmountMinor` stored as `int64` (correct for monetary values)
- Price and price group cascade deletion on event delete
- `hasStarted` date comparison fix in dashboard form actions

### Added — Phase 0: Foundation Hardening
- **Race condition fix**: `Participate` wrapped in `g.db.Transaction()` to prevent overbooking
- **Security headers**: CSP (13 directives), HSTS (1yr + preload), Permissions-Policy in `next.config.ts`
- **Secret key removal**: Removed hardcoded Clerk test key from Go flag defaults in `main.go`
- **Logging sanitization**: Removed `req.Any()` payload logging from `LoggingInterceptor`
- **Rate limiting**: Per-IP rate limiter (10 req/s, burst 20) in `backend/ratelimit.go`
- **Feature flag**: `ZENAO_PAID_EVENTS_ENABLED` / `NEXT_PUBLIC_PAID_EVENTS_ENABLED` env vars

### Changed
- `.env.example` updated with Stripe, paid events feature flag, and app base URL variables
- Proto types regenerated with `actor_id` / `actor_plan` fields in `GetUserInfoResponse`
