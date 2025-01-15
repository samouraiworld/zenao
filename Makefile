.PHONY: start.gnodev
start.gnodev:
	gnodev $$(find gno -name gno.mod -type f -exec dirname {} \;)

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

.PHONY: clean-gno
clean-gno:
	rm -rf gnobuild
