# Plan 18-02 Summary

**Completed:** 2026-05-22

## What was built
Wave 2 turned the browser path into the actual shipped contract instead of a coexistence path. The legacy SVG renderer, custom `deck-button` / `deck-surface` / `deck-text` host contract, `sireno-deck-cli/jsx` export, and primitive-style wrapper metadata were removed from the supported product path.

The runtime is now DOM-only: addon button instances must return ordinary React elements, the daemon only renders browser-hosted deck content, and bundled/runtime-owned surfaces were migrated onto the same DOM contract. The shipped builtin surface now includes browser-rendered `date-time`, `analog-clock`, `calendar-sheet`, `emoji-selector`, `action`, `change-deck`, and toggle buttons under the single `react-dom`/Chromium path.

## Key files
- `packages/cli/src/cli/commands/start.ts`: no longer imports or references `text-image`; runtime deck rendering is browser-only.
- `packages/cli/src/deck/runtime.ts`: removed the legacy custom-render fallback branch and now requires React element output.
- `packages/cli/src/addon/api.ts`: narrowed the public authoring surface to DOM helpers and `ButtonSurface` metadata only.
- `packages/cli/src/core/schemas.ts`: removed `style_id` / `wrapper_id` preservation and validation from config.
- `packages/cli/src/builtin-addons/date-time/index.ts`: date/time builtins now render through DOM content only.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: shipped emoji surfaces now render through DOM helpers.
- `packages/cli/fixtures/phase-18/config.dom-frame-defaults.yml`: committed review fixture for default framed content plus explicit full-surface escape hatches.

## Decisions made
- Took the hard-cut option and removed the old public authoring contract instead of preserving a compatibility facade.
- Removed wrapper/style primitive metadata entirely because it only existed to feed the deleted renderer path.
- Rebased builtin and focused CLI/config tests onto rendered DOM content and browser-only behavior rather than prop-shape snapshots from deleted custom elements.

## Deviations
- Focused verification was completed on the plan's target files first; broader historical runtime tests still need follow-up migration because many of them directly construct deleted `deck-button` elements in test doubles.

## Notes for downstream
- `packages/cli/src/deck/runtime.test.ts` still contains old-contract test scaffolding and should be rebaselined before relying on whole-suite green status.
- The package no longer exports `sireno-deck-cli/jsx` or the old custom render helpers, so any downstream examples/docs need to teach plain React DOM authoring instead.
