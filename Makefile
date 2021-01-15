SHELL:=/bin/bash
DIST_DIR=dist

DEPENDENCIES = node npm yarn
K := $(foreach exec,$(DEPENDENCIES), $(if $(shell which "$(exec)"),dependencies_ok,$(error Command Not Found: "$(exec)")))

# Default target executed on error.
error:
	@printf "\nUnknown target (Makefile error).\n\nAbort.\n\n"
	@exit 2

.PHONY: install-yarn
install-yarn:
	@curl --compressed -o- -L https://yarnpkg.com/install.sh | bash && source ~/.bashrc && yarn --version

.PHONY: compile
compile:
	@make clean-js && yarn tsc

.PHONY: install
install:
	@make env

.PHONY: clean-js
clean-js:
	@rm -rf dist-js

.PHONY: env
env:
	@yarn && printf "\nAll dependencies have been installed successfully!\n\n"

.PHONY: update
update:
	@npx npm-check-updates -u && yarn && printf "\nAll dependencies have been updated successfully!\n\n"

.PHONY: build-rpm
build-rpm:
	@make compile && ./node_modules/.bin/electron-builder --linux rpm

.PHONY: build-deb
build-deb:
	@make compile && ./node_modules/.bin/electron-builder --linux deb

.PHONY: build-snap
build-snap:
	@make compile && ./node_modules/.bin/electron-builder --linux snap

.PHONY: build-pacman
build-pacman:
	@make compile && ./node_modules/.bin/electron-builder --linux pacman

.PHONY: build-appimage
build-appimage:
	@make compile && ./node_modules/.bin/electron-builder --linux appImage

.PHONY: build-win
build-win:
	@make compile && ./node_modules/.bin/electron-builder --win

.PHONY: build-linux
build-linux:
	@make compile && ./node_modules/.bin/electron-builder --linux

.PHONY: build-all
build-all:
	@make compile && ./node_modules/.bin/electron-builder --linux --windows

.PHONY: run
run:
	@yarn start

.PHONY: clean
clean:
	@rm -rf $(DIST_DIR) && printf "\nBuild artifacts (from './$(DIST_DIR)') have been deleted successfully!\n\n"

.PHONY: clean-env
clean-env:
	@rm -rf node_modules yarn.lock $(DIST_DIR) dist-js && printf "\nCleanup OK!\n\n"

.PHONY: list
list:
	@printf "\nAvailable Makefile commands:\n\n" && $(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' && printf "\n\n"
