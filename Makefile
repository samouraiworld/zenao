CAT := $(if $(filter $(OS),Windows_NT),type,cat)

.PHONY: setup-dev
setup-dev:
	@echo "Setting up Zenao development environment..."
	@echo ""
	@# Check Node version
	@REQUIRED_NODE=$$(cat .nvmrc); \
	CURRENT_NODE=$$(node --version 2>/dev/null | sed 's/v//'); \
	if [ "$$CURRENT_NODE" != "$$REQUIRED_NODE" ]; then \
		echo "❌ Node version mismatch: v$$CURRENT_NODE (expected v$$REQUIRED_NODE)"; \
		echo "   Run: nvm use  (or: fnm use)"; \
		exit 1; \
	fi
	@echo "✓ Using Node $$(node --version)"
	@echo ""
	@echo "Step 1: Installing dependencies..."
	npm install
	go mod download
	@echo ""
	@echo "Step 2: Setting up environment variables..."
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "✓ Created .env.local"; \
	else \
		echo "⚠ .env.local already exists, skipping..."; \
	fi
	@echo ""
	@if [ ! -f dev.db ]; then \
		@echo "Step 3: Running database migrations..." \
		$(MAKE) migrate-local; \
		echo ""; \
		echo "Step 4: Generating fake data..."; \
		go run ./backend fakegen; \
	else \
		echo "⚠ dev.db already exists, skipping migrations and fake data..."; \
	fi
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "To start development:"
	@echo "  make dev          # Start both backend and frontend"
	@echo ""
	@echo "Or run separately:"
	@echo "  go run ./backend start    # Terminal 1: Backend"
	@echo "  npm run dev               # Terminal 2: Frontend"

.PHONY: dev
dev:
	@echo "Starting Zenao development environment..."
	@echo "Make sure you have run 'make migrate-local' first!"
	@echo ""
	@trap 'kill 0' EXIT; \
	echo "Starting backend on http://localhost:4242 ..."; \
	go run ./backend start & \
	sleep 2; \
	echo "Starting frontend on http://localhost:3000 ..."; \
	npm run dev

.PHONY: dev-otel
dev-otel:
	@echo "Starting Zenao development environment with OpenTelemetry..."
	@echo ""
	@trap 'docker compose -f dev.docker-compose.yml down; kill 0' EXIT; \
	echo "Starting OTEL collector and Jaeger..."; \
	docker compose -f dev.docker-compose.yml up -d; \
	sleep 2; \
	echo "Jaeger UI available at http://localhost:16686"; \
	$(MAKE) dev

.PHONY: test
test:
	go test ./backend/...

.PHONY: test-e2e
test-e2e:
	@echo "Starting E2E test environment..."
	@trap 'kill 0' EXIT; \
	go run ./backend e2e-infra & \
	sleep 5; \
	npm run dev & \
	sleep 5; \
	npm run cypress:e2e:headless; \
	echo "E2E tests complete"

.PHONY: generate
generate:
	npm i
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf generate
	go run golang.org/x/tools/cmd/goimports@latest -w ./backend
	npm run mail:build

.PHONY: lint-buf
lint-buf:
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf lint

.PHONY: lint-fix
lint-fix:
	npx next lint --fix

.PHONY: update-schema
update-schema:
	atlas schema inspect --env gorm --url "env://src" > schema.hcl

.PHONY: migrate-local
migrate-local:
	atlas migrate apply --dir "file://migrations" --env dev