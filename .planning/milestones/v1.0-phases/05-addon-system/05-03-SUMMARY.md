# Plan 05-03 Summary

**Completed:** 2026-05-13

## What was built
The addon model now covers the rest of the Phase 5 surface instead of stopping at button registration. Core gained addon-owned assets and deck-type expansion, and the repo now ships a bundled emoji selector addon that generates category decks, favorites-aware decks, and selection buttons through the same addon contract used for other bundled and external addons.

## Key files
- `packages/cli/src/addon/api.ts`: adds addon asset and deck-type registration to the v1 addon contract.
- `packages/cli/src/addon/registry.ts`: stores addon deck definitions and resolves `addon://` asset references.
- `packages/cli/src/core/schemas.ts`: expands addon-provided deck types into concrete decks before full button validation and resolves addon asset paths during payload parsing.
- `packages/cli/src/deck/runtime.ts`: keeps runtime generic while hosting navigation across addon-generated decks.
- `builtin-addons/emoji-selector/src/index.ts`: ships the bundled emoji selector addon with category browsing, favorites, and selection behavior.
- `config.yml`: demonstrates addon asset references plus the bundled emoji selector deck type.

## Decisions made
- Used `addon://<addon-name>/<asset>` references so config stays YAML-friendly while assets still resolve to concrete filesystem paths before rendering.
- Kept deck types as config-time expansion instead of runtime factories so the deck controller and runtime could remain small and generic.

## Notes for downstream
- Phase 5 verification can treat the full addon contract as delivered: local/npm loading, addon assets, addon deck types, and the emoji selector proof now share one registry-backed path.
- The remaining workflow step is `verify-work 5` for manual UAT against real hardware and interactive emoji usage.
