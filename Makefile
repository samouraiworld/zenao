CAT := $(if $(filter $(OS),Windows_NT),type,cat)

.PHONY: setup
setup:
	@echo "Setting up Zenao development environment..."
	@echo ""
	@echo "Step 1: Installing dependencies..."
	npm install
	@echo ""
	@echo "Step 2: Installing Atlas CLI..."
	@$(MAKE) install-atlas
	@echo ""
	@echo "Step 3: Setting up environment variables..."
	@if [ ! -f .env.local ]; then \
		cp .env.backend-dev .env.local; \
		echo "✓ Created .env.local"; \
	else \
		echo "⚠ .env.local already exists, skipping..."; \
	fi
	@echo ""
	@if [ ! -f dev.db ]; then \
		@echo "Step 4: Running database migrations..." \
		$(MAKE) migrate-local; \
		echo ""; \
		echo "Step 5: Generating fake data..."; \
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
	@echo "Starting backend on http://localhost:4242 ..."
	@go run ./backend start &
	@sleep 2
	@echo "Starting frontend on http://localhost:3000 ..."
	@npm run dev

.PHONY: generate
generate:
	npm i
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf generate
	goimports -w ./backend
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

# TODO: use normal atlas binary when https://github.com/ariga/atlas/pull/3112 is merged
.PHONY: install-atlas
install-atlas:
	rm -fr atlas
	git clone https://github.com/samouraiworld/atlas.git
	cd atlas && git fetch origin versioned-libsql-support
	cd atlas && git checkout c261f318ac25924555e63fdf005cc53de43fa5db
	cd atlas/cmd/atlas && go install .
	rm -fr atlas