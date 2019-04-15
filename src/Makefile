DIST_DIR=dist

DEPENDENCIES = node npm
K := $(foreach exec,$(DEPENDENCIES), $(if $(shell which "$(exec)"),dependencies_ok,$(error Command Not Found: "$(exec)")))

# Default target executed on error.
error:
	@printf "\nUnknown target (Makefile error).\n\nAbort.\n\n"
	@exit 2

.PHONY: env
env:
	@sudo npm install -g npm-check-updates && ncu -u && npm install && printf "\nAll development dependencies have been installed successfully!\n\n"

.PHONY: build
build:
	@./node_modules/.bin/electron-builder && printf "\n\nAll package build targets have been built successfully in $(DIST_DIR) directory!\n\n"

.PHONY: run
run:
	@npm run start

.PHONY: clean
clean:
	@rm -rf $(DIST_DIR) && printf "\nBuild artifacts (from './$(DIST_DIR)') have been deleted successfully!\n\n"

.PHONY: list
list:
	@printf "\nAvailable Makefile commands:\n\n" && $(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' && printf "\n\n"