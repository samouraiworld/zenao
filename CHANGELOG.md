# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v0.8.0] — Process Hardening & Production Stabilization (2026-03-02)

### ⚠️ Post-Mortem: Production Incident (2026-02-28)

On Feb 28, 2026, a production outage affected zenao.io for several hours:

- **Root cause**: 50 commits pushed directly to `main` without branch protection, pre-merge CI gates, or local E2E validation
- **Impact**: `/discover` 500 errors, CSP blocking Clerk login, SSR serialization crash, Netlify build failures
- **Resolution**: 6+ emergency hotfixes applied directly to `main`
- **Prevention**: This release introduces comprehensive process hardening (see below)

### Added — Process Hardening

- **Branch protection**: `develop` branch created as integration gate before `main`
- **CI: TypeScript type check** (`tsc --noEmit`) — catches type errors before merge
- **CI: Next.js build** (`next build`) — catches SSR crashes, serialization errors, import issues
- **CI: Prettier format check** (`prettier --check`) — catches formatting regressions
- **CI: Go race detection** (`go test -race`) — catches concurrency bugs
- **CI: Atlas migration validation** (`atlas migrate validate`) — catches bad migrations
- **CI: Security audit** (`security.yml`) — npm audit + govulncheck (informational)
- **CI: Docker build check** (`docker.yml`) — validates Dockerfile builds successfully
- **CI: Post-deploy smoke test** — automated HTTP health check after prod/staging deploys
- **Local: `make pre-push`** — runs all 6 check steps locally before pushing
- **Local: `.githooks/pre-push`** — git hook that runs `make pre-push` automatically
- **Docs: `CONTRIBUTING.md`** — mandatory GitFlow-lite workflow documentation
- **E2E: `discover.cy.ts`** — tests the exact pages that caused the outage
- **E2E: `smoke.cy.ts`** — lightweight smoke tests for all critical pages + security headers
- **E2E: `i18n.cy.ts`** — locale switching and translation key validation
- **CI triggers**: All 10 check workflows now run on `develop` branch pushes

### Fixed — Production Outage (2026-02-28)

- **Production outage**: Backend stuck in `--maintenance` mode after deploy failed at migration step
- **Deploy safety**: Added rollback step on migration failure in `deploy-prod.yml` and `deploy-staging.yml`
- **Emergency recovery**: New `emergency-clear-maintenance.yml` workflow
- **Netlify build**: Fixed 5 lint/prettier errors from PR #1026 that blocked all deploys
- **CSP**: Added backend API origin and Clerk custom domain to CSP directives
- **SSR 500**: Replaced `z.bigint()` with `z.coerce.number()` in `eventInfoSchema` (BigInt not JSON-serializable)
- **Discover page**: Removed suspense query (crashes SSR), added `await` with try-catch for prefetch
- **/discover 404**: Added missing `page.tsx` redirect

### Added — Paid Events v1

- **Phase 2: Ticket Purchase** (PR #1025) — Stripe checkout, order state machine, ticket issuance with idempotency, 30 Go unit tests
- **Phase 1: Price Listing** (PR #1010) — Price groups, Stripe onboarding guard, cascade deletion
- **Phase 0: Foundation** — Race condition fix, CSP headers, rate limiting, secret key removal

### Added — Features

- **Locale switching**: Cookie-based language switcher (EN/FR/ES) with `Accept-Language` auto-detection
- **Location filter** (#1026, @nitinog10): Haversine-based geographic event filtering on Discover page
- **i18n: Spanish translation**: Complete 690-key Spanish locale
- **i18n: FR quality review**: 48 missing keys added, 8 untranslated strings fixed
- **`db.go` domain split**: Refactored 2817-line monolith into 8 domain-specific files

### Security

- **npm audit clean**: All high-severity vulnerabilities resolved
- **Go OTel SDK CVE**: Upgraded `v1.38.0 → v1.40.0` (CVE-2026-24051)
- **Next.js CVE**: Upgraded `15.5.7 → 15.5.12` (RCE, source exposure, DoS)
- **Dependabot (12 alerts)**: Upgraded `react-email` v4→v5, Go indirect deps
- **Sentry domains**: Restricted from wildcard to `zenao.io` + `*.zenao.io`

### Fixed

- **Dashboard hydration** (#1014): Replaced `Math.random()` in `useMemo()` with deterministic width
- **Sentry Apdex**: Numeric ID validation prevents `strconv.ParseUint` errors from bot traffic
- **Atlas upgrade**: v0.31.0 → v1.1.0 (fixes `unsupported dialect "libsql"`)
- **Dockerfile**: Go 1.24 → 1.25.7 to match `go.mod`
- **Schema CI**: Deterministic FK ordering via `normalize-schema.sh`

### Repository Maintenance

- **Branch cleanup**: 385 → 9 remote branches
- **PR housekeeping**: Closed PRs #908, #992, #1017
- **Unused flag cleanup**: Removed `NEXT_PUBLIC_PAID_EVENTS_ENABLED`

---

## [v0.7.0] — Previous Release

See git history for earlier changes.
