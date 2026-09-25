.DEFAULT_GOAL := help

.PHONY: help dev check verify update reset

help:
	@echo "PastPins tooling (Bun scripts are the source of truth)"
	@echo "  make dev     Start Expo Go through a tunnel"
	@echo "  make check   Lint, typecheck, test, and verify generated assets"
	@echo "  make verify  Run the shared CI gate before pushing"
	@echo "  make update  Update compatible packages and run all checks"
	@echo "  make reset   Reinstall this project's dependencies and Expo state"
	@echo ""
	@echo "Run 'bun run' to list all package scripts."

dev:
	bun run dev

check:
	bun run check

verify:
	bun run verify

update:
	bun run deps:update

reset:
	bun run reset
