# Contributing to Zenao

Thank you for contributing to Zenao! This document outlines the development workflow and standards that all contributors must follow.

## Branch Strategy

We use a **GitFlow-lite** branching model:

```
feature/* ──→ develop ──→ main (production)
```

| Branch      | Purpose                                            | Who merges                         |
| ----------- | -------------------------------------------------- | ---------------------------------- |
| `main`      | Production-ready code. **Never push directly.**    | Maintainers only, after full audit |
| `develop`   | Integration branch. All features merge here first. | Any contributor via PR             |
| `feature/*` | Individual feature or fix branches                 | Created by contributors            |
| `fix/*`     | Bug fix branches                                   | Created by contributors            |

### Rules

1. **Never push directly to `main`** — All changes go through PRs
2. **Never push directly to `develop`** — All changes go through PRs
3. **All PRs require CI to pass** — Every workflow must be green
4. **All PRs require 1 review** — No self-merging
5. **Use conventional commit messages** — e.g., `feat:`, `fix:`, `docs:`, `ci:`, `chore:`

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-feature
```

### 2. Develop Locally

```bash
make dev          # Start backend + frontend
make test         # Run Go unit tests
make test-e2e     # Run Cypress E2E tests
```

### 3. Run Pre-Push Checks

**Before every push**, run the full local check suite:

```bash
make pre-push
```

This runs:

1. TypeScript type check (`tsc --noEmit`)
2. ESLint + Prettier lint
3. Next.js build (catches SSR errors)
4. Go tests with race detection
5. golangci-lint
6. Schema validation

> **Tip:** Enable the git hook to run this automatically:
>
> ```bash
> git config core.hooksPath .githooks
> ```

### 4. Open a Pull Request

- Target branch: `develop`
- Use a [conventional commit](https://www.conventionalcommits.org/) title
- Wait for all CI checks to pass (18 workflows)
- Request a review from a maintainer

### 5. Merge to `main` (Maintainers Only)

When `develop` is stable and fully tested:

1. Open PR from `develop` → `main`
2. Perform a deep audit:
   - All CI checks green
   - Manual review of changed files
   - E2E tests pass on staging
   - Documentation is up to date
3. Merge only after explicit approval

## CI Checks

Every PR triggers these automated checks:

| Check                 | File                | What it catches               |
| --------------------- | ------------------- | ----------------------------- |
| TypeScript type check | `js.yml`            | Type errors                   |
| ESLint + Prettier     | `js.yml`            | Lint + formatting             |
| Next.js build         | `js.yml`            | SSR crashes, import errors    |
| Go tests (race)       | `go.yml`            | Backend bugs, race conditions |
| Migration validation  | `go.yml`            | Bad SQL migrations            |
| Go lint               | `golangci-lint.yml` | Go code quality               |
| Go format             | `go-fmt.yml`        | Go formatting                 |
| Schema check          | `schema.yml`        | Schema drift                  |
| Protobuf codegen      | `buf-gen.yml`       | Stale generated code          |
| Protobuf lint         | `buf-lint.yml`      | Proto file quality            |
| Translations          | `translations.yml`  | Missing i18n keys             |
| PR title              | `lint-pr-title.yml` | Conventional commits          |
| E2E tests             | `e2e.yml`           | Full-stack integration        |
| Security audit        | `security.yml`      | Dependency vulnerabilities    |
| Docker build          | `docker.yml`        | Dockerfile validity           |

## Documentation

When making changes, update the following as needed:

- **`CHANGELOG.md`** — Document user-facing changes
- **`README.md`** — Update setup instructions or feature descriptions
- **Code comments** — Explain non-obvious logic
- **`.env.example`** — Add new environment variables

## Code Style

- **TypeScript**: Strict mode, no `any` (use `unknown`), Prettier formatting
- **Go**: `gofmt` + `golangci-lint`, no `JSON.parse` in TS (use sanitization utils)
- **CSS**: TailwindCSS with Shadcn UI components
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
- **File names**: kebab-case (enforced by ESLint rule)

## Need Help?

- Check the [README](./README.md) for setup instructions
- Open an issue for bug reports or feature requests
- Reach out to the team on the project's communication channels
