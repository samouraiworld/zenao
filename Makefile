CAT := $(if $(filter $(OS),Windows_NT),type,cat)

.PHONY: generate
generate:
	npm i
	go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
	buf generate

.PHONY: start.gnodev
start.gnodev:
	gnodev --add-account g1m0lplhma8z4uruds4zcltmlgwlht7w739e6qlp=100000000000ugnot $$(find gno -name gno.mod -type f -exec dirname {} \;)

.PHONY: clone-gno
clone-gno:
	rm -fr gnobuild
	mkdir -p gnobuild
	cd gnobuild && git clone https://github.com/gnolang/gno.git && cd gno && git checkout $(shell $(CAT) .gnoversion)
	cp -r ./gno/p ./gnobuild/gno/examples/gno.land/p/zenao
	cp -r ./gno/r ./gnobuild/gno/examples/gno.land/r/zenao

.PHONY: install-gno
install-gno:
	cd gnobuild/gno && make install

.PHONY: build-gno
build-gno:
	cd gnobuild/gno/gnovm && make build

.PHONY: lint-gno
lint-gno:
	./gnobuild/gno/gnovm/build/gno lint ./gno/. -v

.PHONY: test-gno
test-gno:
	./gnobuild/gno/gnovm/build/gno test ./gno/... -v

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

.PHONY: create-migration
create-migration:
	atlas migrate diff TODO \
		--dir "file://migrations" \
		--to "file://schema.hcl" \
		--dev-url "sqlite://file?mode=memory"

.PHONY: migrate-dev
migrate-dev:
	atlas migrate apply \
		--dir "file://migrations" \
		--url "sqlite://dev.db"

.PHONY: update-schema
update-schema:
	atlas schema inspect --env gorm --url "env://src" > schema.hcl

.PHONY: install-atlas
install-atlas:
	rm -fr atlas
	git clone git@github.com:ariga/atlas.git
	cd atlas && git remote add delkopiso git@github.com:delkopiso/atlas.git
	cd atlas && git fetch delkopiso libsql-support
	cd atlas && git checkout c261f318ac25924555e63fdf005cc53de43fa5db
	cd atlas/cmd/atlas && go install .
	rm -fr atlas