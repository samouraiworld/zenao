# Zenao

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started (Staging)

First, [node + npm via nvm](https://github.com/nvm-sh/nvm).

The `.env.local` default env file present on main branch is populated with values targeting the staging environment.

Now run the development server:

```bash
nvm use
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Getting Started (Local)

First, [install golang](https://go.dev/doc/install) and [node + npm via nvm](https://github.com/nvm-sh/nvm).

Install gno tools if you don't have them:

```bash
git clone git@github.com:gnolang/gno.git
cd gno
make install
cd ..
```

Install [atlas](https://atlasgo.io) using a special branch with support for versioned migrations for libsql:

```bash
make install-atlas
```

Override local env with dev env
```bash
cp .env.dev .env.local
```

Now, start gnodev with the admin account:

```bash
make start.gnodev
```

In another terminal, initialize the db and start the backend:

```bash
make migrate-local
go run ./backend start
```

Optionally, generate fake data:
```bash
go run ./backend fakegen
```

In a third terminal, run the development server:

```bash
nvm use
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Run E2E tests locally

First, [install golang](https://go.dev/doc/install) and [node + npm via nvm](https://github.com/nvm-sh/nvm).

Install gno tools if you don't have them:

```bash
git clone git@github.com:gnolang/gno.git
cd gno
make install
cd ..
```

Install [atlas](https://atlasgo.io) using a special branch with support for versioned migrations for libsql:

```bash
make install-atlas
```

Override local env with dev env
```bash
cp .env.dev .env.local
```

Now, run the e2e stack
```bash
go run ./backend e2e-infra
```

This prepares the local db, starts gnodev as well as the backend, run fakegen and print logs in a single terminal.

It also serves a `http://localhost:4243/reset` http endpoint to reset the stack state. This endpoint is crucial to automate tests. Calls to the reset endpoint will be deduplicated and wait for the current reset to finish if one is ongoing.

In a second terminal, run the development server:

```bash
nvm use
npm i
npm run dev
```

Wait for the stack to warm up, you should get the following line in the e2e-infra terminal when it is:
```
READY   | ----------------------------
```

In a third terminal, open cypress in e2e mode
```bash
npm run cypress:e2e
```

Select a test like `main.cy.ts`, this will automatically start runnning the test and when done watch for changes in the test file located at `cypress/e2e/main.cy.ts`.

You can now edit the tests and they will automatically re-run on save. If you only edited app sources, you can run the tests manually by clicking on the refresh icon in cypress ui.

Flaky tests, or tests that require cypress hacks to pass are probably a sign of bad architecture / unstable app code, try to think about what could introduce instability and fix it at the root ;)

## Edit api

First, [install buf](https://buf.build/docs/installation/).

Edit the `.proto` files, when you are done, run the codegen with

```bash
make generate
```

## Update database schema

### Prerequisite

Install [atlas](https://atlasgo.io) using a special branch with support for versioned migrations for libsql:

```bash
make install-atlas
```

### Migration flow

First, edit the gorm models in `./backend/gzdb`.
New models must embbed `gorm.Model` or use a gorm annotation for at least one field.

Then, update the atlas schema using the gorm adapter:
```bash
make update-schema
```

You can now create a new migration, replace `$MIGRATION_NAME` with the name of the migration:
```bash
atlas migrate diff $MIGRATION_NAME \
		--dir "file://migrations" \
		--to "file://schema.hcl" \
		--dev-url "sqlite://file?mode=memory"
```

Finally you can migrate a db, replace `$ENV` by one of `dev`, `staging`, `prod`:
```bash
atlas migrate apply --dir "file://migrations" --env $ENV
```
For `staging` and `prod` envs, you need to pass a write-enabled turso token via the `TURSO_TOKEN` env var
If you create a new prod token, make sure it is short-lived (1 day should be enough in most cases).