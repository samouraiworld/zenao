# Zenao - Zen Autonomous Organizations

An event management and community platform featuring event creation, community management, and social feeds.

> **Note:** Zenao is currently a Web2 application, with plans to transition to Web3 using [base](https://www.base.org/).

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Go, Connect-RPC (gRPC-web)
- **Database**: SQLite/LibSQL (Turso), GORM, Atlas migrations
- **Auth**: Clerk
- **Testing**: Cypress (E2E)
- **Observability**: OpenTelemetry, Sentry

## Prerequisites

- **Node.js 20+** ([download](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)/[fnm](https://github.com/Schniz/fnm))
- **Go 1.21+** ([download](https://go.dev/doc/install))

## Quick Start - Full Local Development

Follow these steps to run the complete stack locally (frontend + backend + database):

### Option 1: Automated Setup (Recommended)

Run the setup script to install dependencies, configure environment, and initialize the database:

```bash
make setup
```

Then start the development servers:

```bash
make dev
```

That's it! The app will be running at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:4242](http://localhost:4242)

### Option 2: Manual Setup

If you prefer to run each step manually:

### 1. Install Dependencies

```bash
nvm use # or fnm use
npm install
make install-atlas
```

### 2. Setup Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

**Note:** This uses Clerk test keys that work out of the box - no Clerk account needed for local development.

**Optional:** If testing file uploads, add `PINATA_JWT` to `.env.local` (get from team/admin)

### 3. Initialize Database

```bash
# Create and migrate the local SQLite database
make migrate-local
```

This creates a `dev.db` file in the project root.

### 4. Start Backend

In a dedicated terminal:
```bash
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
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""

# Backend Configuration
NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT=http://localhost:4242
NEXT_PUBLIC_ZENAO_NAMESPACE=zenao
NEXT_PUBLIC_GATEWAY_URL=pinata.zenao.io
PINATA_GROUP=""

# Observability (optional - only if running OTEL collector via docker compose)
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
SEOBOT_API_KEY=""

# File uploads (optional - get from team/admin if needed)
# PINATA_JWT=
```

### Backend (Environment Variables)

The backend reads these from the environment (prefixed with `ZENAO_`). **All have defaults**, so they're optional for local development:

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

**1. Install Vercel CLI:**
```bash
npm i -g vercel
```

**2. Pull staging environment variables:**
```bash
vercel link  # Follow prompts to link to the Zenao project
vercel env pull .env.local
```

> **Note:** You need to be a member of the Zenao Vercel team to access staging environment variables. Contact a team admin if you don't have access.

This will populate `.env.local` with staging credentials including:
- `CLERK_SECRET_KEY` - Real staging Clerk key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Staging publishable key
- Other staging-specific variables

**3. Update backend endpoint:**

Edit `.env.local` and change the backend endpoint to point to staging:
```bash
# Replace localhost with your staging URL
NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT=https://your-staging-backend-url.vercel.app
```

**4. Start only the frontend:**
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
| `make setup` | Install dependencies, configure environment, run migrations, and generate fake data |
| `make dev` | Start backend and frontend servers together |
| `make dev-otel` | Start backend, frontend, and OTEL stack (Jaeger UI at localhost:16686) |
| `make test` | Run Go backend unit tests |
| `make test-e2e` | Run Cypress E2E tests in headless mode |
| `make generate` | Regenerate protobuf code and email templates |
| `make migrate-local` | Apply database migrations to local dev.db |
| `make install-atlas` | Install the Atlas CLI for database migrations |
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
