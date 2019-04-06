DIST_DIR=dist

.PHONY: env
env:
	@sudo npm install -g npm-check-updates && ncu -u && npm install && cd app && ncu -u && npm install && echo -en "\nAll development dependencies have been installed successfully!\n\n"

.PHONY: build
build:
	@./node_modules/.bin/electron-builder && echo -en "\n\nAll package build targets have been built successfully in $(DIST_DIR) directory!\n\n"

.PHONY: run
run:
	@npm run start

.PHONY: clean
clean:
	@rm -rf $(DIST_DIR) && echo -en "\nBuild artifacts (from './$(DIST_DIR)') have been deleted successfully!\n\n"

.PHONY: list
list:
	@echo -en "\nAvailable Makefile commands:\n\n" && $(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' && echo -en "\n\n"