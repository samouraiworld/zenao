CAT := $(if $(filter $(OS),Windows_NT),type,cat)

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