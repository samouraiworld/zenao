# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — Production Incident Fix & Deploy Hardening

### Fixed
- **Production outage (2026-02-28)**: Backend stuck in `--maintenance` mode after deploy #22523329085 failed at migration step — `git restore` in "Upgrade backend" never ran, leaving all RPC endpoints returning `CodeUnavailable`
- **Deploy workflow safety net**: Added "Rollback maintenance on migration failure" step to both `deploy-prod.yml` and `deploy-staging.yml` — if migration fails, `git restore` + container rebuild runs automatically via `if: failure()`
- **Emergency recovery workflow**: New `emergency-clear-maintenance.yml` — one-click workflow_dispatch to clear stuck maintenance mode on prod or staging via SSH
- **CSP `connect-src` fix**: Backend API origin (`NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT`) was missing from CSP — browser blocked all client-side RPC calls to `api.prod.zenao.io`, causing `ConnectError: Failed to fetch` on every page

---

## [Unreleased] — Repository Hygiene Sprint

### Security
- **npm audit clean**: Resolved all 5 high-severity vulnerabilities via `serialize-javascript` override (`6.0.2 → 7.0.3`)
- **Sentry upgrade**: `@sentry/nextjs` `10.20.0 → 10.40.0` (latest stable minor)
- **Go OTel SDK CVE**: Upgraded `go.opentelemetry.io/otel/sdk` `v1.38.0 → v1.40.0` — fixes CVE-2026-24051 (PATH hijacking ACE on macOS)
- **Sentry Allowed Domains**: Restricted from `*` (wildcard) to `zenao.io`, `*.zenao.io`, `localhost`
- **`.gitignore` fix**: `*.sh` blanket rule → `/*.sh` (root only) — prevents accidental script exclusion
- **`.gitignore` fix**: Added `packages/*/node_modules/` to prevent dependency leak
- **CSP fix**: Added `sentry.samourai.pro` to `connect-src` for self-hosted Sentry instance

### Added
- **Locale switching**: Cookie-based language switcher (EN/FR/ES) with `Accept-Language` auto-detection and globe icon in header/footer
- **Location filter** (#1026, @nitinog10): Filter events by geographic proximity on Discover page — Haversine formula, browser Geolocation API, radius selection (10-250km), privacy-respecting (no data stored)
- **`db.go` domain split**: Refactored 2817-line monolith into 8 domain-specific files (events, communities, users, tickets, feeds, pricing, roles)

### Fixed
- **Sentry Apdex fix**: Added numeric ID validation in `event/[id]` and `profile/[userId]` layouts — prevents `strconv.ParseUint` errors from bot traffic (70% of top Sentry issues)
- **Atlas upgrade**: v0.31.0 → v1.1.0 — fixes `unsupported dialect "libsql"` deploy failure across all CI workflows
- **Dockerfile Go version**: 1.24 → 1.25 to match `go.mod` requirement — fixes Docker build failure on staging VPS
- **404 for bots**: `/event/create`, `/event/sitemap.xml`, and hex user IDs now return 404 instead of crashing

### Changed
- **Sentry config migration**: `disableLogger` → `webpack.treeshake.removeDebugLogging`, `automaticVercelMonitors` → `webpack.automaticVercelMonitors`, `unstable_sentryWebpackPluginOptions.disable` → `sourcemaps.disable`
- **Removed dead code**: Cleaned up duplicate commented-out `tunnelRoute` in `next.config.ts`

### Repository Maintenance
- **Branch cleanup**: Deleted 380 stale remote branches (385 → 9 total)
- **PR housekeeping**: Closed PR #908 (superseded by #915) and PR #992 (stale CI testing draft)
- **i18n: Spanish locale scaffold**: Added `es.json` skeleton (EN fallback) for LATAM expansion roadmap
- **i18n: Complete Spanish translation**: Translated all 949 lines of `es.json` to proper Spanish with correct grammar, accents, and ICU interpolation
- **i18n: FR quality review**: Added 48 missing FR keys (checkout, payment, order, pricing), fixed 8 untranslated strings, removed 3 legacy extras — all 3 locales now at 690 keys parity
- **i18n: 3-locale support**: Updated `i18n-check` tool to validate EN/FR/ES
- **i18n: Unused key audit**: Analyzed 195 reported unused keys — all confirmed as false positives (checker limitation with namespace-scoped `useTranslations()` calls)

### Fixed
- **Dashboard hydration error (#1014)**: `SidebarMenuSkeleton` used `Math.random()` in `useMemo()` producing different skeleton widths on SSR vs CSR — replaced with deterministic 70% width
- **Prettier fix**: Fixed pre-existing indentation error in `sidebar.tsx` line 638

### Repository Maintenance
- **PR #1017 closed**: Draft "Add langage button" superseded by locale switching (`bd4bb88e`)
- **Unused flag cleanup**: Removed `NEXT_PUBLIC_PAID_EVENTS_ENABLED` — never referenced in frontend code, backend flag is the sole gate
- **Staging Stripe config**: `deploy-staging.yml` now injects `ZENAO_STRIPE_SECRET_KEY` + `ZENAO_PAID_EVENTS_ENABLED=true` into VPS `backend.env` during deploy
- **Production Stripe config**: `deploy-prod.yml` injects live Stripe key into production VPS `backend.env`

### Fixed
- **/discover page 404**: Added missing `page.tsx` redirect to `/discover/upcoming` — the route broke during file structure refactoring (#918)
- **Production DB migration**: Manually applied `20260116120000_orders_ticketing` on Turso prod — `PRAGMA foreign_keys = off` is ignored by Turso/LibSQL, required manual `checkins` FK handling before `sold_tickets` table swap (1302 tickets + 235 checkins preserved)

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
