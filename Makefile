CAT := $(if $(filter $(OS),Windows_NT),type,cat)
GNODEV := gnodev staging --add-account g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94=100000000000ugnot $$(find gno -name gno.mod -type f -exec dirname {} \;)
TXS_FILE ?=

.PHONY: generate
generate:
	npm i
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf generate
	gno fmt -w ./gno/...
	npm run mail:build

.PHONY: lint-buf
lint-buf:
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf lint

.PHONY: start.gnodev
start.gnodev:
	$(GNODEV)

.PHONY: start.gnodev
start.gnodev-e2e:
	$(GNODEV) --unsafe-api --txs-file=$(TXS_FILE)

.PHONY: clone-testing-gno
clone-testing-gno:
	rm -fr gnobuild
	mkdir -p gnobuild
	cd gnobuild && git clone https://github.com/gnolang/gno.git && cd gno && git checkout $(shell $(CAT) .gnoversion)
	cp -r ./gno/p ./gnobuild/gno/examples/gno.land/p/zenao
	cp -r ./gno/r ./gnobuild/gno/examples/gno.land/r/zenao

gnobuild: .gnoversion
	rm -fr gnobuild
	mkdir -p gnobuild
	cd gnobuild && git clone https://github.com/gnolang/gno.git && cd gno && git checkout $(shell $(CAT) .gnoversion)

.PHONY: install-gno
install-gno:
	cd gnobuild/gno && make install

gnobuild/gno/gnovm/build/gno: gnobuild
	cd gnobuild/gno/gnovm && make build

.PHONY: lint-gno
lint-gno: gnobuild/gno/gnovm/build/gno
	./gnobuild/gno/gnovm/build/gno tool lint ./gno/. -v

.PHONY: test-gno
test-gno: gnobuild/gno/gnovm/build/gno
	cd gno && ../gnobuild/gno/gnovm/build/gno test ./... -v

.PHONY: test-gno-ci
test-gno-ci: gnobuild/gno/gnovm/build/gno
	cd gnobuild/gno/examples && ../gnovm/build/gno test ./... -v

.PHONY: gno-mod-tidy
gno-mod-tidy:
	export gno=$$(pwd)/gnobuild/gno/gnovm/build/gno; \
	find gno -name gno.mod -type f | xargs -I'{}' sh -c 'cd $$(dirname {}); $$gno mod tidy' \;

.PHONY: clean-gno
clean-gno:
	rm -rf gnobuild

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