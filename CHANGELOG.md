# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — Repository Hygiene Sprint

### Security
- **npm audit clean**: Resolved all 5 high-severity vulnerabilities via `serialize-javascript` override (`6.0.2 → 7.0.3`)
- **Sentry upgrade**: `@sentry/nextjs` `10.20.0 → 10.40.0` (latest stable minor)
- **`.gitignore` fix**: `*.sh` blanket rule → `/*.sh` (root only) — prevents accidental script exclusion
- **`.gitignore` fix**: Added `packages/*/node_modules/` to prevent dependency leak

### Changed
- **Sentry config migration**: `disableLogger` → `webpack.treeshake.removeDebugLogging`, `automaticVercelMonitors` → `webpack.automaticVercelMonitors`, `unstable_sentryWebpackPluginOptions.disable` → `sourcemaps.disable`
- **Removed dead code**: Cleaned up duplicate commented-out `tunnelRoute` in `next.config.ts`

### Repository Maintenance
- **Branch cleanup**: Deleted 380 stale remote branches (385 → 9 total)
- **PR housekeeping**: Closed PR #908 (superseded by #915) and PR #992 (stale CI testing draft)

---

## [Unreleased] — Security, Build & CI Hardening

### Fixed
- **Schema CI**: Pin atlas binary to `v0.31.0` via `release.ariga.io` (was floating `-latest` from `atlasbinaries.com`)
- **Schema CI**: Add `scripts/normalize-schema.sh` to sort FK blocks alphabetically (deterministic output)
- **Schema CI**: Regenerate `schema.hcl` with deterministic FK ordering (fixes pre-existing CI failure since Jan 24)
- **Dependabot (12 alerts)**: Upgrade `react-email` v4→v5 + `@react-email/components` v0.5→v1.0 (4 Next.js CVEs)
- **Dependabot**: Upgrade `@eslint/json` v0.9→v1.0 in `packages/i18n-check` (minimatch + ajv + plugin-kit ReDoS)
- **Dependabot**: Upgrade Go indirect deps: `edwards25519` v1.2.0, `quic-go` v0.59.0, `gqlparser` v2.5.32
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
