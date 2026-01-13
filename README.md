# Zenao - Zen Autonomous Organizations

An event management and community platform featuring event creation, community management, and social feeds.

> **Note:** Zenao is currently a Web2 application, with plans to transition to Web3 using [base](https://www.base.org/).

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start - Full Local Development](#quick-start---full-local-development)
- [Environment Variables Reference](#environment-variables-reference)
- [Testing](#testing)
- [Clerk Authentication Setup](#clerk-authentication-setup)
- [File Uploads with Pinata](#file-uploads-with-pinata)
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
- **Testing**: Cypress (E2E)
- **Observability**: OpenTelemetry, Sentry

## Prerequisites

- **Node.js 20.13.1+** ([download](https://nodejs.org/))
- **Go 1.21+** ([download](https://go.dev/doc/install))

> **⚠️ Important:** This project uses **Node.js 20.13.1** (see `.nvmrc`), which is not the latest version. Using a different Node version may cause package-lock.json conflicts and CI failures. We strongly recommend using a Node version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to switch to the correct version:
> ```bash
> nvm use  # or: fnm use
> ```

## Quick Start - Full Local Development

Follow these steps to run the complete stack locally (frontend + backend + database):

**Before you start:** You may need to configure these services:
- [Clerk Authentication Setup](#clerk-authentication-setup) - If the default test keys have expired
- [File Uploads with Pinata](#file-uploads-with-pinata) - Required to upload images (e.g., create events)

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

> **⚠️ Note:** The Go backend reads environment variables from your shell, not from `.env.local`. Export the Clerk secret key before running `make dev` if you modified the default key:
> ```bash
> export ZENAO_CLERK_SECRET_KEY=sk_test_...  # Must match CLERK_SECRET_KEY in .env.local
> ```

### Option 2: Manual Setup

If you prefer to run each step manually:

### 1. Install Dependencies

```bash
nvm use # or fnm use
npm install
```

If you need to test file uploads, add back the `PINATA_JWT` in `.env.local`

To test the payout features locally you will need a Stripe account and a Stripe test secret key.
This can be obtained from the [Stripe dashboard](https://dashboard.stripe.com/apikeys).
The env variable to set is `ZENAO_STRIPE_SECRET_KEY`.

To be redirected to the Zenao app once onboarding is complete,
a value for `ZENAO_APP_BASE_URL` is required and must be set to the app URL
(e.g., `http://localhost:3000/`)

To redirect users to the Stripe dashboard, set a value for
`NEXT_PUBLIC_STRIPE_DASHBOARD_URL`. It defaults to `https://dashboard.stripe.com/`,
which is the live Stripe dashboard.

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

# File uploads - See README "File Uploads with Pinata" section
NEXT_PUBLIC_GATEWAY_URL=pinata.zenao.io
PINATA_GROUP=f2ecce4d-b615-48ee-8ae8-744145b40dcb  # Optional: for organizing files in Pinata dashboard
PINATA_JWT="" # Required for uploading images (e.g., to create events)

# Observability (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
SEOBOT_API_KEY=a8c58738-7b98-4597-b20a-0bb1c2fe5772
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
DISCORD_TOKEN=                                        # Default: empty (Discord disabled)
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

## File Uploads with Pinata

> **⚠️ Note:** File uploads are required to create events. Without Pinata configured, you cannot upload event images.

### Setup

**1. Create a free Pinata account:** [app.pinata.cloud/register](https://app.pinata.cloud/register)

**2. Create an API Key:**
- Dashboard → **API Keys** → **+ New Key**
- Grant **Files** write permission and **Group** read permission
- Copy the JWT (shown only once!)

**3. Create a Gateway:**
- Dashboard → **Gateways** → **+ New Gateway**
- Copy your gateway domain (e.g., `your-name.mypinata.cloud`)

**4. (Optional) Create a Group:**
- Dashboard → **Groups** → **+ Create Group**
- Copy the Group ID (used to organize uploaded files)

**5. Update `.env.local`:**

```bash
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_GATEWAY_URL=your-name.mypinata.cloud  # Domain only, no https://
PINATA_GROUP=your-group-id  # Optional
```

**6. Restart:** `npm run dev`

### Common Issues

**Upload fails:**
- Check you haven't exceeded 1GB free tier limit
- Restart dev server after changing `.env.local`

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

**1. Edit GORM models** in `./backend/gzdb` (models must embed `gorm.Model` or have gorm annotations)

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
├── backend/          # Go backend (Connect-RPC handlers)
├── components/       # React components
├── cypress/          # E2E tests
├── migrations/       # Atlas database migrations
├── api/              # Protobuf definitions
├── lib/              # Shared utilities
├── public/           # Static assets
├── dev.db            # Local SQLite database (created after setup)
└── .env.local        # Environment variables (create from .env.example)
```
