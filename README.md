# Zenao - Zen Autonomous Organizations

An event management and community platform featuring event creation, community management, and social feeds.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start - Full Local Development](#quick-start---full-local-development)
- [Environment Variables Reference](#environment-variables-reference)
- [Testing](#testing)
- [Clerk Authentication Setup](#clerk-authentication-setup)
- [File Uploads (IPFS)](#file-uploads-ipfs)
- [Paid Events & Stripe](#paid-events--stripe)
- [Development Workflows](#development-workflows)
- [Observability (Optional)](#observability-optional)
- [Working with Staging/Production](#working-with-stagingproduction)
- [Troubleshooting](#troubleshooting)
- [Make Commands](#make-commands)
- [Project Structure](#project-structure)

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Go, Connect-RPC (gRPC-web)
- **Database**: SQLite/LibSQL (Turso), GORM, Atlas migrations
- **Auth**: Clerk
- **Payments**: Stripe (checkout sessions, webhooks)
- **Testing**: Cypress (E2E)
- **Observability**: OpenTelemetry, Sentry
- **i18n**: next-intl (English, French, Spanish — 690 keys each)

## Prerequisites

- **Node.js 20.13.1+** ([download](https://nodejs.org/))
- **Go 1.25+** ([download](https://go.dev/doc/install))

> **⚠️ Important:** This project uses **Node.js 20.13.1** (see `.nvmrc`), which is not the latest version. Using a different Node version may cause package-lock.json conflicts and CI failures. We strongly recommend using a Node version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to switch to the correct version:
> ```bash
> nvm use  # or: fnm use
> ```

## Quick Start - Full Local Development

Follow these steps to run the complete stack locally (frontend + backend + database):

**Before you start:** You may need to configure these services:
- [Clerk Authentication Setup](#clerk-authentication-setup) - If the default test keys have expired
- [File Uploads (IPFS)](#file-uploads-ipfs) - Docker runs the local IPFS node needed to upload images (e.g., create events)

### Option 1: Automated Setup (Recommended)

Run the setup script to install dependencies, configure environment, and initialize the database:

```bash
make setup-dev
```

Then start the development servers:

```bash
make dev
```

That's it! The app will be running at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:4242](http://localhost:4242)

> **⚠️ Note:** The Go backend reads environment variables from your shell, not from `.env.local`. Export any backend key before running `make dev`:
> ```bash
> export ZENAO_CLERK_SECRET_KEY=sk_test_...        # Must match CLERK_SECRET_KEY in .env.local
> export ZENAO_STRIPE_SECRET_KEY=sk_test_...       # Required for paid events
> export ZENAO_APP_BASE_URL=http://localhost:3000  # Else Stripe redirects to prod (default: https://zenao.io/)
> ```

### Option 2: Manual Setup

If you prefer to run each step manually:

### 1. Install Dependencies

```bash
nvm use # or fnm use
npm install
```

### 2. Setup Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

### 3. Initialize Database

```bash
# Create and migrate the local SQLite database
make migrate-local
```

This creates a `dev.db` file in the project root.

### 4. Start Backend

In a dedicated terminal, export the Clerk secret key (if you modified the default) and start the backend:
```bash
export ZENAO_CLERK_SECRET_KEY=sk_test_...  # Must match CLERK_SECRET_KEY in .env.local
go run ./backend start
```

The backend will run on http://localhost:4242

**Optional:** Generate fake data for development:
```bash
go run ./backend fakegen
```

### 5. Start Frontend

In a new terminal:
```bash
npm run dev
```

### 6. Access the Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4242](http://localhost:4242)
- **Database**: `dev.db` (SQLite file in project root)

You can inspect the database using any SQLite client:
```bash
sqlite3 dev.db
# Or use a GUI like DB Browser for SQLite
```

## Environment Variables Reference

### Frontend (`.env.local`)

These variables are set by copying `.env.example`:

```bash
# Clerk Authentication (test keys for local development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Backend Configuration
NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT=http://localhost:4242
NEXT_PUBLIC_ZENAO_NAMESPACE=zenao

# Stripe configuration
NEXT_PUBLIC_STRIPE_DASHBOARD_URL=https://dashboard.stripe.com/test

# File uploads - See README "File Uploads (IPFS)" section
NEXT_PUBLIC_IPFS_GATEWAY_URL=http://127.0.0.1:8080  # IPFS gateway, scheme included (default: https://ipfs.zenao.io)

# Observability (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
SEOBOT_API_KEY=a8c58738-7b98-4597-b20a-0bb1c2fe5772

# Sentry (optional — error monitoring)
NEXT_PUBLIC_SENTRY_DSN= # Your Sentry DSN (leave empty to disable)
NEXT_PUBLIC_ENV=development # Controls sourcemap upload and Sentry behavior
```

### Backend (Environment Variables)

The backend reads these from the environment (prefixed with `ZENAO_`), not from the `.env.local`. **All have defaults**, so they're optional for local development:

> **⚠️ Important:** If you modify `CLERK_SECRET_KEY` in `.env.local`, you must also export `ZENAO_CLERK_SECRET_KEY` with the same value before starting the backend.

```bash
# Optional overrides (backend has sensible defaults):
ZENAO_CLERK_SECRET_KEY=sk_test_...                    # Default: sk_test_...
ZENAO_DB=dev.db                                       # Default: dev.db
ZENAO_ALLOWED_ORIGINS=*                               # Default: * (all origins)
ZENAO_MAIL_SENDER=contact@mail.zenao.io               # Default: contact@mail.zenao.io
ZENAO_RESEND_SECRET_KEY=                              # Default: empty (emails disabled)
ZENAO_STRIPE_SECRET_KEY=sk_test_...                   # Default: empty (stripe disabled)
ZENAO_PAID_EVENTS_ENABLED=false                       # Default: false (paid events disabled)
ZENAO_APP_BASE_URL=                                   # Default: https://zenao.io/
DISCORD_TOKEN=                                        # Default: empty (Discord disabled)
ZENAO_FILE_STORE=kubo                                 # Default: kubo (or pinata), see "File Uploads (IPFS)"
ZENAO_IPFS_API_URL=http://127.0.0.1:5001              # Default: http://127.0.0.1:5001 (kubo RPC API, never public)
ZENAO_IPFS_GATEWAY_URL=https://ipfs.zenao.io          # Default: https://ipfs.zenao.io (links in mails and PDFs)
ZENAO_PINATA_JWT=                                     # Default: empty (only with ZENAO_FILE_STORE=pinata)
ZENAO_PINATA_GROUP=                                   # Default: empty (optional, with ZENAO_FILE_STORE=pinata)
```

## Testing

### Unit Tests

Run Go backend tests:
```bash
make test
```

### E2E Tests

Run E2E tests in headless mode (automated):
```bash
make test-e2e
```

Or run manually with the Cypress UI:

**1. Setup environment:**
```bash
cp .env.example .env.local
```

**2. Start E2E infrastructure:**
```bash
go run ./backend e2e-infra
```

This command sets up the E2E local environment:
- Applies Atlas migrations on a temporary SQLite DB (`e2e.db`)
- Generates fake data (users, events, posts, communities, etc.)
- Starts the backend
- Exposes `http://localhost:4243/reset` endpoint for test automation (deduplicates/queues concurrent reset requests)
- Prints logs from all services

**Optional:** Use the `--ci` flag to also build and start the Next.js frontend in the background (used for CI):
```bash
go run ./backend e2e-infra --ci
```

See `backend/e2e_infra.go` for implementation details.

**3. Wait for stack readiness:**
```
READY   | ----------------------------
```

**4. Start frontend (new terminal):**
```bash
npm run dev
```

**5. Open Cypress (new terminal):**
```bash
npm run cypress:e2e
```

Select a test file (e.g., `cypress/main.cy.ts`) to run. Tests auto-rerun on file changes.

## Clerk Authentication Setup

The project includes default Clerk test keys that work out of the box. If you encounter authentication errors (e.g., "unauthorized"), the test keys may have expired.

### Creating Your Own Clerk Keys

**1. Create a free Clerk account:** [clerk.com/sign-up](https://clerk.com/sign-up)

**2. Create a new application** in the Clerk dashboard

**3. Get your API keys:**
- Dashboard → **API Keys**
- Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_...`)
- Copy `CLERK_SECRET_KEY` (starts with `sk_test_...`)

**4. Update `.env.local`:**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

**5. Export for backend:**

```bash
export ZENAO_CLERK_SECRET_KEY=sk_test_your_key_here
```

## File Uploads (IPFS)

Uploaded files (event images, avatars, audio) are stored on a self-hosted IPFS node
([kubo](https://github.com/ipfs/kubo)) and referenced in the database as `ipfs://<CIDv1>`.

How it works:

- The browser posts the file (multipart field `file`) to the backend endpoint `POST /files` with
  the Clerk session token. The backend rejects anonymous and banned users, files over 5 MiB, HTML
  files and users over 100 MiB per day, then adds the file to kubo through its RPC API and returns
  `{"uri": "ipfs://<cid>"}`.
- Uploaded files are kept forever. The backend refuses uploads with HTTP 507 once the node reaches
  its `Datastore.StorageMax` (`ZENAO_IPFS_STORAGE_MAX`, default `20GB`).
- The kubo RPC API (port 5001) gives full control of the node: it is never published, and only the
  backend shares the `ipfs` Docker network with it.
- Files are shown through the kubo gateway (`/ipfs/<cid>`), served by the host nginx on
  `https://ipfs.zenao.io` (`https://ipfs.staging.zenao.io` on staging).
- The node is isolated (`ipfs/zenao-config.sh`): it does not join the public IPFS network and its
  gateway serves only local files (`Gateway.NoFetch`), so it cannot be used as an open gateway.
- Files are added with `cid-version=1`, `raw-leaves`, 256 KiB chunks and sha2-256, the same
  parameters as the former Pinata uploads: the same file gives the same CID on kubo and on Pinata.

### Local development

`make dev` and `make dev-otel` start the local node from `dev.docker-compose.yml` (Docker
required). To start it alone:

```bash
docker compose -f dev.docker-compose.yml up -d ipfs
```

The backend defaults to the RPC API on `http://127.0.0.1:5001`; set
`NEXT_PUBLIC_IPFS_GATEWAY_URL=http://127.0.0.1:8080` in `.env.local` (already in `.env.example`).
Use `127.0.0.1`, not `localhost`: kubo redirects `localhost` to subdomain URLs.

Integration test against the local node:

```bash
ZENAO_TEST_KUBO_API_URL=http://127.0.0.1:5001 ZENAO_TEST_KUBO_GATEWAY_URL=http://127.0.0.1:8080 \
  go test ./backend -run TestKuboFileStoreIntegration
```

### Server runbook

Production is `62.210.92.144` (`prod.backend.docker-compose.yml`), staging is `51.159.98.163`
(`staging.docker-compose.yml`, domain `ipfs.staging.zenao.io`). Run the steps below on each server,
as root, in the `zenao` checkout; replace the compose file and domains for staging.

**1. DNS (Gandi, zone `zenao.io`).**

- `ipfs` → `A 62.210.92.144`; `ipfs.staging` → `A 51.159.98.163`.
- `pinata` → replace the CNAME to Pinata with `A 62.210.92.144`, so that image links in mails
  already sent keep working for the files present on the node.

**2. nginx site for the gateway.** Create `/etc/nginx/sites-available/ipfs.zenao.io`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ipfs.zenao.io pinata.zenao.io;

    # Read-only access to /ipfs/<cid> only. No /ipns/, no RPC API.
    location /ipfs/ {
        limit_except GET HEAD { deny all; }
        # $uri drops the query string: kubo gateway parameters such as
        # ?filename=x.html would let it serve any file as text/html.
        proxy_pass http://127.0.0.1:8080$uri;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Required. Uploaded files are untrusted: a browser must never run them
        # as a page on a zenao.io origin (SVG files can hold scripts).
        add_header Content-Security-Policy "sandbox" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    location / {
        return 404;
    }
}
```

Then enable it and get the certificate (the DNS records of step 1 must resolve first):

```bash
ln -s /etc/nginx/sites-available/ipfs.zenao.io /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d ipfs.zenao.io -d pinata.zenao.io
```

**3. Upload size on the backend site.** nginx refuses request bodies over 1 MB by default. Raise the
limit for the upload endpoint only: in the `server` block of `api.prod.zenao.io`, add a location
that copies the `proxy_*` lines of the existing `location /`, then
`nginx -t && systemctl reload nginx`:

```nginx
    location = /files {
        client_max_body_size 6m;
        # same proxy_pass and proxy_set_header lines as in "location /"
    }
```

**4. First start.** Optionally set the storage cap in `~/zenao/.env` (read by docker compose), for
example `ZENAO_IPFS_STORAGE_MAX=50GB`; keep it well below the free disk space, since backups are
also written to this disk. Run the "Deploy Prod" (or "Deploy Staging") workflow. It starts the
`ipfs` service after the backend. Run it right after merging: Netlify deploys the frontend from
`main`, and uploads fail until the backend serves `/files` (they already fail since Pinata
stopped). Check:

```bash
docker compose -f prod.backend.docker-compose.yml ps ipfs   # healthy
curl -sI https://ipfs.zenao.io/ipfs/bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa
```

The `curl` returns 404 until step 5 adds that file.

**5. Restore the default images.** Database rows still reference the former default avatar,
banners and mail icons by CID. Add the original files to the node. They are in `public/images/`
once the local default images change is merged, and in commit `88b6eba3` before that. The script
prints `ok` when the CID matches:

```bash
git fetch origin
while read -r cid file; do
  if [ -f "public/images/$file" ]; then src="cat public/images/$file"; else src="git show 88b6eba3:public/images/$file"; fi
  got=$($src | docker compose -f prod.backend.docker-compose.yml exec -T ipfs \
    ipfs add --cid-version=1 --raw-leaves --chunker=size-262144 --pin -Q)
  [ "$got" = "$cid" ] && echo "ok $file" || echo "MISMATCH $file: $got"
done <<'EOF'
bafybeib2gyk2yagrcdrnhpgbaj6an6ghk2liwx2mshhoa6d54y2mheny24 community-image-fallback.png
bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa mail-calendar-icon.png
bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli mail-logo.jpg
bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa mail-pin-icon.png
bafybeigirez6x4hn5ghchng5eoxoi2bkcglaybuz4np6joub6zja5om6l4 manifesto-image.png
bafybeidp4z4cywvdzoyqgdolcqmmxeug62qukpl3nfumjquqragxwr7bny profile-avatar-fallback.png
bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy user-default-avatar.png
EOF
```

Other files uploaded to Pinata before it stopped are lost unless someone has a copy.

**6. Backups.** `scripts/ipfs-backup.sh` exports each new pinned file once as a CAR file, without
stopping kubo, copies it to a Scaleway Object Storage bucket with rclone (run from a pinned Docker
image), then deletes the local copy; `/root/ipfs-backup/exported.txt` lists the files already
backed up. Until a run succeeds, a new upload exists only on the server disk. Create the bucket and
an API key in the Scaleway console, then write `/root/ipfs-backup.env` (`chmod 600`):

```bash
RCLONE_CONFIG_SCW_TYPE=s3
RCLONE_CONFIG_SCW_PROVIDER=Scaleway
RCLONE_CONFIG_SCW_REGION=fr-par
RCLONE_CONFIG_SCW_ENDPOINT=s3.fr-par.scw.cloud
RCLONE_CONFIG_SCW_ACCESS_KEY_ID=<access key>
RCLONE_CONFIG_SCW_SECRET_ACCESS_KEY=<secret key>
```

Run it once by hand, then add an hourly cron entry (`crontab -e`). The script exits with a non-zero
status and an `ERROR` line in the log when the node or the bucket is unreachable:

```bash
15 * * * * cd /root/zenao && scripts/ipfs-backup.sh prod.backend.docker-compose.yml /root/ipfs-backup scw:<bucket>/prod /root/ipfs-backup.env >> /var/log/zenao-ipfs-backup.log 2>&1
```

Restore (new server or lost volume), after step 4: download the CAR files from the bucket, then
import them:

```bash
mkdir -p /root/ipfs-restore
docker run --rm --env-file /root/ipfs-backup.env -v /root/ipfs-restore:/restore \
  rclone/rclone:1.75.2 copy scw:<bucket>/prod /restore
for car in /root/ipfs-restore/*.car; do
  docker compose -f prod.backend.docker-compose.yml exec -T ipfs ipfs dag import --pin-roots < "$car"
done
```

**7. Environment variables.**

- Netlify: set `NEXT_PUBLIC_IPFS_GATEWAY_URL` (`https://ipfs.zenao.io` in production, which is also
  the default; `https://ipfs.staging.zenao.io` for staging). Remove `PINATA_JWT`, `PINATA_GROUP`
  and `NEXT_PUBLIC_GATEWAY_URL`.
- Staging `backend.env`: add `ZENAO_IPFS_GATEWAY_URL=https://ipfs.staging.zenao.io` (production
  uses the default).
- GitHub: the `TEST_PINATA_JWT` secret is no longer used.

### Moving back to Pinata

The backend can store files on Pinata instead of kubo, with configuration only. CIDs stay the same.

1. In `backend.env`: `ZENAO_FILE_STORE=pinata`, `ZENAO_PINATA_JWT=<JWT with Files write>`,
   optionally `ZENAO_PINATA_GROUP=<group id>`, and `ZENAO_IPFS_GATEWAY_URL=https://pinata.zenao.io`.
2. Copy the files of the kubo node to Pinata. The command runs in a new container, so it reads the
   updated `backend.env`; it checks that Pinata returns the same CID and lists the CIDs missing on
   the node (files already lost):

   ```bash
   docker compose -f prod.backend.docker-compose.yml run --rm --no-deps --entrypoint /bin/zenao-backend \
     backend copy-ipfs-files -ipfs-api-url http://ipfs:5001
   ```

   Add `-dry-run` first to list the CIDs and check which ones are on the node.
3. DNS: point `pinata` back to the Pinata dedicated gateway (CNAME). Netlify:
   `NEXT_PUBLIC_IPFS_GATEWAY_URL=https://pinata.zenao.io`.
4. Redeploy the backend (the "Deploy Prod" workflow) to apply `backend.env`.

## Paid Events & Stripe

Zenao supports paid events with Stripe checkout. This feature is behind a feature flag and disabled by default.

### Enabling Paid Events

**1. Set the backend feature flag** (as environment variable, not from `.env.local`):
```bash
export ZENAO_PAID_EVENTS_ENABLED=true
```

> **Note:** The frontend always renders price fields when price groups exist in event data. No frontend flag is needed.

**2. Configure Stripe test keys:**
```bash
# Backend — must be exported in your shell (not read from .env.local)
export ZENAO_STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
# Local app base URL used to build the Stripe success/cancel redirect URLs.
# Without it the backend falls back to the default (https://zenao.io/) and
# Stripe sends you to production instead of localhost after payment.
export ZENAO_APP_BASE_URL=http://localhost:3000
```

```bash
# Frontend — in .env.local
NEXT_PUBLIC_STRIPE_DASHBOARD_URL=https://dashboard.stripe.com/test
```

Get test keys from [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys).

**3. (For payment confirmation) Start the Stripe webhook listener:**
```bash
# Install the Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:4242/webhook/stripe
```

This forwards Stripe webhook events (e.g., `checkout.session.completed`) to your local backend for order confirmation and ticket issuance.

### How It Works

1. **Organizer** creates an event with price groups (e.g., "General Admission — €15")
2. **Participant** clicks "Get Tickets" → redirected to Stripe Checkout
3. **Stripe** processes payment → sends webhook to backend
4. **Backend** confirms order, issues tickets, sends confirmation email
5. **Participant** sees tickets in their orders page

### Security

- Prices are validated server-side (`validatePriceGroups` rejects negatives, validates currency)
- Stripe idempotency keys prevent double charges
- Atomic order updates prevent double-confirmation
- Ticket issuance is idempotent with `ON CONFLICT DO NOTHING`
- Capacity control uses sold count + active holds vs capacity
- Expired holds are cleaned before capacity checks

### Enabling Paid Events on Staging

Use the **Configure Staging Stripe** GitHub Actions workflow to configure Stripe on the staging server and set the correct Netlify preview URL as `ZENAO_APP_BASE_URL` (required for Stripe redirect URLs after onboarding/checkout).

1. Go to **Actions** → **Configure Staging Stripe** → **Run workflow**
2. Enter the PR number (e.g. `1083`) — the workflow builds the Netlify URL automatically
3. The workflow sets `ZENAO_STRIPE_SECRET_KEY`, `ZENAO_PAID_EVENTS_ENABLED=true`, and `ZENAO_APP_BASE_URL`, then restarts the backend

> **Note:** Re-run the workflow whenever you switch to a different PR/preview URL.

### Rate Limiting

The backend includes per-IP rate limiting (10 requests/second, burst of 20) on all mutation endpoints. This protects against abuse of payment, event creation, and participation endpoints.

## Development Workflows

### API Changes

Edit `.proto` files in the `api/` directories, then regenerate code:

```bash
make generate
```

This will:
- Run protobuf code generation
- Build email templates
- Format Go code

### Database Schema Updates

**1. Edit GORM models** in `./backend/gzdb` (domain-split files: `db_events.go`, `db_communities.go`, `db_users.go`, `db_tickets.go`, `db_feeds.go`, `db_pricing.go`, `db_roles.go`)

**2. Update Atlas schema:**
```bash
make update-schema
```

**3. Create migration:**
```bash
atlas migrate diff $MIGRATION_NAME \
  --dir "file://migrations" \
  --to "file://schema.hcl" \
  --dev-url "sqlite://file?mode=memory"
```

**4. Apply migration locally:**
```bash
make migrate-local
```

**5. Apply to staging/production:**
```bash
# For staging or prod, set TURSO_TOKEN with a write-enabled token
export TURSO_TOKEN=<your-token>
atlas migrate apply --dir "file://migrations" --env staging  # or prod
```

**Note:** Production tokens should be short-lived (1 day max).

## Observability (Optional)

For debugging and tracing requests across the stack, you can run an OpenTelemetry collector with Jaeger locally.

### Quick Start (Recommended)

Start the full stack with OTEL enabled:
```bash
make dev-otel
```

This starts everything together:
- **Frontend** on [http://localhost:3000](http://localhost:3000)
- **Backend** on [http://localhost:4242](http://localhost:4242)
- **OTEL Collector** on port 4318
- **Jaeger UI** on [http://localhost:16686](http://localhost:16686)

### Manual Setup

**1. Start the OTEL stack:**
```bash
docker compose -f dev.docker-compose.yml up
```

This starts:
- **OTEL Collector** on port 4318 - receives traces from the app
- **Jaeger UI** on [http://localhost:16686](http://localhost:16686) - visualize traces

**2. Enable OTEL in your environment:**

Set the OTEL endpoint in `.env.local`:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**3. Restart the backend** to start sending traces.

**4. Open Jaeger UI** at [http://localhost:16686](http://localhost:16686) to view request traces.

This is useful for:
- Debugging slow requests
- Understanding request flow between frontend and backend
- Performance optimization

## Working with Staging/Production

### Using Staging Backend for Frontend Development

If you want to develop the frontend using the staging backend (instead of running the backend locally):

**1. Get staging environment variables:**

Copy the staging environment variables from your deployment platform's dashboard (Netlify, etc.) or ask a team admin for the `.env.local` file with staging credentials.

> **Note:** You need to be a team member to access staging environment variables. Contact a team admin if you don't have access.

**2. Start only the frontend:**
```bash
npm run dev
```

Now your local frontend will connect to the staging backend and use real staging data.

### Accessing Staging/Production Data

When using staging environment variables:
- You'll see **real user data** from staging
- Authentication uses the **staging Clerk instance**
- Any changes affect the **staging database**

**Use with caution** - this is real data, not test data!

## Troubleshooting

### Database connection errors
Ensure you've run migrations:
```bash
make migrate-local
```

### Cannot access database file
The database is created at `dev.db` in the project root after running `make migrate-local`.

## Make Commands

| Command | Description |
|---------|-------------|
| `make setup-dev` | Install dependencies, configure environment, run migrations, and generate fake data |
| `make dev` | Start backend and frontend servers together |
| `make dev-otel` | Start backend, frontend, and OTEL stack (Jaeger UI at localhost:16686) |
| `make test` | Run Go backend unit tests |
| `make test-e2e` | Run Cypress E2E tests in headless mode |
| `make generate` | Regenerate protobuf code and email templates |
| `make migrate-local` | Apply database migrations to local dev.db |
| `make update-schema` | Update Atlas schema from GORM models |
| `make lint-fix` | Run ESLint with auto-fix |

## Project Structure

```
├── app/              # Next.js app router pages
│   └── i18n/         # Internationalization (en.json, fr.json, es.json)
├── backend/          # Go backend (Connect-RPC handlers)
│   └── gzdb/         # Database layer (domain-split: events, communities, users, tickets, feeds, pricing, roles)
├── components/       # React components
├── cypress/          # E2E tests
├── migrations/       # Atlas database migrations
├── api/              # Protobuf definitions
├── lib/              # Shared utilities
├── packages/         # Internal packages (i18n-check)
├── public/           # Static assets
├── dev.db            # Local SQLite database (created after setup)
└── .env.local        # Environment variables (create from .env.example)
```
