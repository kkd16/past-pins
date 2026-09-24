.DEFAULT_GOAL := help

.PHONY: help dev update reset

help:
	@echo "Past Pins tooling"
	@echo ""
	@echo "  make dev          Start Expo Go through a tunnel"
	@echo "  make update       Update dependencies within compatible version ranges"
	@echo "  make reset        Rebuild the local development environment"

dev:
	@echo "=== Starting Past Pins ==="
	@echo "1) Starting Expo Go through a tunnel"
	@echo "   Scan the QR code with your iPhone or iPad"
	@bunx expo start --go --tunnel
update:
	@echo "=== Updating dependencies ==="
	@echo "1) Updating packages within their declared compatibility ranges"
	@bun update
	@echo "   ✓ Dependencies and bun.lock updated"
	@echo "2) Aligning Expo packages with the installed SDK"
	@bunx expo install --fix --bun
	@echo "   ✓ Expo packages aligned"
	@bun run globe:generate
	@echo "3) Checking project health"
	@bunx expo-doctor
	@echo "✓ Dependencies updated"

reset:
	@echo "=== Resetting the local development environment ==="
	@echo "1) Removing installed dependencies and local Expo state"
	@rm -rf node_modules .expo
	@echo "   ✓ Project state removed"
	@echo "2) Resetting Watchman"
	@if command -v watchman >/dev/null 2>&1; then \
		watchman watch-del-all >/dev/null; \
		echo "   ✓ Watchman reset"; \
	else \
		echo "   - Watchman not installed; skipped"; \
	fi
	@echo "3) Removing Metro temporary caches"
	@cache_root="$${TMPDIR:-/tmp}"; \
	if [ ! -d "$$cache_root" ] || [ "$$cache_root" = "/" ]; then \
		echo "   ✗ Refusing unsafe cache directory: $$cache_root"; \
		exit 1; \
	fi; \
	for cache_dir in "$$cache_root"/metro-* "$$cache_root"/haste-map-*; do \
		[ -d "$$cache_dir" ] || continue; \
		rm -rf "$$cache_dir"; \
	done
	@echo "   ✓ Metro caches removed"
	@echo "4) Reinstalling the locked dependency tree"
	@bun install --frozen-lockfile
	@echo "   ✓ Dependencies reinstalled"
	@echo "✓ Local development environment reset"
	@echo "  Run 'make dev' to start Expo Go"
