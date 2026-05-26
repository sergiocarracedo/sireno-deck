# Quick Task 016 Summary

**Task:** Fix ship blockers from full branch test run.
**Completed:** 2026-05-26

## What was done
Closed the three blockers that aborted `/ship` on the full branch state. Two failures were stale test assumptions that still hard-coded `file://` browser HTML even though the live DOM asset resolver now preserves browser-loadable absolute paths. The third failure was real: the committed Phase 23 local raw TSX fixture no longer matched the runtime contract and still depended on an ambient JSX path, so the startup regression never rendered a deck.

## Files changed
- `packages/cli/src/render/dom-host.test.tsx`: updated the browser-path icon assertion to match the current preload plus absolute-path HTML contract instead of forcing `file:///tmp/...`.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`: kept proving the bundled emoji icon-backed path honestly, but stopped requiring a stale literal `file://` substring.
- `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx`: restored the fixture to the real legacy runtime shape by returning an object with `render()` and using `createElement(...)` instead of ambient JSX.

## Verification
- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/builtin-addons/emoji-selector/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "renders the shipped Phase 23 sample config through the runtime without ambient React JSX failures"`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/builtin-addons/emoji-selector/index.test.ts src/cli/commands/start.test.ts -t "normalizes absolute icon paths into browser-loadable file URLs|exports theme CSS vars and the browser utility stylesheet on the deck root|renders bundled icon-backed emoji entry buttons for shipped emoji values|renders the shipped Phase 23 sample config through the runtime without ambient React JSX failures"`

## Commits
- `1762ae6` `test(quick-016): align browser asset expectations`
- `78817e7` `fix(quick-016): restore phase 23 raw addon runtime shape`
