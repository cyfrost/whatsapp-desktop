DIST_DIR=dist
VERSION=1.0.0

DEPENDENCIES = node npm yarn rpmbuild
K := $(foreach exec,$(DEPENDENCIES), $(if $(shell which "$(exec)"),dependencies_ok,$(error Command Not Found: "$(exec)")))

# Default target executed on error.
error:
	@printf "\nUnknown target (Makefile error).\n\nAbort.\n\n"
	@exit 2

.PHONY: env
env:
	@yarn && cd src && yarn && printf "\nAll development dependencies have been installed successfully!\n\n"

.PHONY: update
update:
	@ncu -u && yarn && cd src && ncu -u && yarn && printf "\nAll development dependencies have been installed successfully!\n\n"


.PHONY: build-rpm
build-rpm:
	@./node_modules/.bin/electron-builder --linux rpm

.PHONY: build-deb
build-deb:
	@./node_modules/.bin/electron-builder --linux deb

.PHONY: build-snap
build-snap:
	@./node_modules/.bin/electron-builder --linux snap

.PHONY: build-pacman
build-pacman:
	@./node_modules/.bin/electron-builder --linux pacman

.PHONY: build-appimage
build-appimage:
	@./node_modules/.bin/electron-builder --linux appImage

.PHONY: build-win
build-win:
	@./node_modules/.bin/electron-builder --win

.PHONY: build-linux
build-linux:
	@./node_modules/.bin/electron-builder --linux

.PHONY: build-macos
build-macos:
	@./node_modules/.bin/electron-builder --macos

.PHONY: build-all
build-all:
	@./node_modules/.bin/electron-builder --linux --windows

.PHONY: run
run:
	@cd src && npm run start

.PHONY: set-version
set-version:
	cd src && npm version $(VERSION)

.PHONY: clean
clean:
	@rm -rf $(DIST_DIR) && printf "\nBuild artifacts (from './$(DIST_DIR)') have been deleted successfully!\n\n"

.PHONY: list
list:
	@printf "\nAvailable Makefile commands:\n\n" && $(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' && printf "\n\n"
