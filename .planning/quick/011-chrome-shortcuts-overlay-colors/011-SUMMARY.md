---
task: 011
slug: chrome-shortcuts-overlay-colors
status: done
---

# Quick Task 011 Summary

## Outcome

- Chrome overlay is configurable by stable shortcut IDs with a `favorites` ordering and a `shortcuts` allow-list filter.
- Each overlay branch (chrome, vscode, opencode) renders with a distinct inherited button color that propagates through paginated and nested pages.

## Changes

### Task 1: Configurable Chrome shortcuts (external addon repo)

External addon at `/works/opensource/sireno-deck-addons/chrome-overlay/`, outside this git repo:

- `index.js` rewritten as a dynamic addon with a `shortcuts` catalog and a `selectShortcuts(config)` helper. Each entry has a stable id; `favorites` order selected shortcuts first while preserving their order; `shortcuts` filters and orders the rendered set, dropping unknown and duplicate ids. Deck icon now uses `addon://chrome-overlay/assets/chrome.svg` (copied from `assets/chrome.svg`).
- `index.test.js` Node tests cover default ordering with favorites first, `shortcuts` filtering + ordering with unknown/duplicate drop, and favorites within an explicit `shortcuts` list.

> These files are not part of this repository; they live in a sibling checkout and are not committed here. Verify by running `node --test index.test.js` inside the external addon folder.

### Task 2: Inherited overlay color

Repository changes (committed as `e3a2af5`):

- `packages/cli/src/addon/api.ts`: `AddonGeneratedDeck.buttonColor?: "blue" | "green" | "purple"`.
- `packages/cli/src/cli/commands/addon-decks.ts`: paginated page mapping and non-paginated mapping propagate `buttonColor` to every `RuntimeDeck`.
- `packages/cli/src/deck/runtime.ts`: `RuntimeDeck.buttonColor` optional union.
- `packages/cli/src/deck/deck-config.ts`: each surface includes `buttonColor` when defined.
- `packages/cli/frontend/src/App.tsx`: surface cast accepts `buttonColor` and forwards it to the frontend deck.
- `packages/cli/frontend/src/components/Deck.tsx`: `Deck` and `DeckButtonCell` accept `buttonColor`; normal and split ButtonFrame variants receive it. Temporary error remains `variant="error"`.
- `packages/cli/src/ui/ButtonFrame.tsx`: variants extended with blue, green, purple palettes; default and error unchanged.
- External addon files set distinct colors: chrome → blue, vscode → green, opencode → purple.

### Tests

- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`: pagination propagates `buttonColor: purple` to every page.
- `packages/cli/src/deck/__tests__/deck-config-full-flag.test.ts`: surface includes the configured `buttonColor`.
- Targeted vitest on the two files + surrounding suite: 215 passed / 2 failed. The two failures are pre-existing in `addon-decks.test.ts` and `addon-core-lock.test.ts` (stale expectations around `positionButtons`), confirmed via `git stash` baseline. Out of scope.

### Lint / Typecheck

- Targeted `oxlint` on changed files: clean.
- Full `pnpm typecheck` and `pnpm lint` already fail with extensive pre-existing errors before quick-011; new surface access follows the established `unknown` pattern used by other tests.

## Notes

- `packages/cli/src/api/protocol-internal.ts` was listed in the plan but intentionally left untouched: `surfaces` is already `z.record(z.string(), z.unknown())`, so the runtime can transport `buttonColor` without a schema bump.
- The unrelated worktree changes (`config.yml` modification and untracked `.planning/quick/005-overlay-icons-back-cli/005-PLAN.md`) were preserved.
