CAT := $(if $(filter $(OS),Windows_NT),type,cat)
GNOVERSION := $(shell $(CAT) .gnoversion)
GNODEV := gnobuild/${GNOVERSION}/gnodev staging --add-account g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94=100000000000ugnot $$(find gno -name gnomod.toml -type f -exec dirname {} \;)
TXS_FILE ?= genesis_txs.jsonl
GNO := go run github.com/gnolang/gno/gnovm/cmd/gno@${GNOVERSION}

.PHONY: generate
generate:
	npm i
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf generate
	gno fmt -w ./gno/...
	${MAKE} gno-mod-tidy
	npm run mail:build

.PHONY: lint-buf
lint-buf:
	go run -modfile go.mod github.com/bufbuild/buf/cmd/buf lint

.PHONY: start.gnodev
start.gnodev: gnobuild/${GNOVERSION}/gnodev
	$(GNODEV)

.PHONY: start.gnodev-e2e
start.gnodev-e2e: gnobuild/${GNOVERSION}/gnodev
	$(GNODEV) --unsafe-api --txs-file=$(TXS_FILE)

.PHONY: lint-gno
lint-gno:
	${GNO} lint ./gno/... -v

.PHONY: test-gno
test-gno:
	${GNO} test ./gno/... -v

.PHONY: gno-mod-tidy
gno-mod-tidy:
	find gno -name gnomod.toml -type f | xargs -I'{}' sh -c 'cd $$(dirname {}); ${GNO} mod tidy' \;

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

# we need this since gnodev cannot be `go run`ed
gnobuild/${GNOVERSION}/gnodev:
	rm -fr gnobuild/${GNOVERSION}
	mkdir -p gnobuild/${GNOVERSION}/gno
	git clone https://github.com/gnolang/gno.git gnobuild/${GNOVERSION}/gno
	cd gnobuild/${GNOVERSION}/gno && git checkout ${GNOVERSION}
	cd gnobuild/${GNOVERSION}/gno/contribs/gnodev && make build
	cp gnobuild/${GNOVERSION}/gno/contribs/gnodev/build/gnodev gnobuild/${GNOVERSION}/gnodev
	touch gnobuild/${GNOVERSION}/gno/gnowork.toml


.PHONY: deploy.ticket-master
deploy.ticket-master:
	forge create --private-key ${DEPLOYER_PRIVATE_KEY} --broadcast --chain base-sepolia --verify ./src/TicketMaster.sol:TicketMaster --rpc-url ${EVM_RPC_URL}

.PHONY: gen.eth-sdk
gen.eth-sdk:
	npx eth-sdk