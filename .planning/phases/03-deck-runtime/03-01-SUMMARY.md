---
phase: 03-deck-runtime
plan: 03-01
completed: 2026-06-23
tests_added: 38
tests_total: 107
status: done
---

# 03-01-SUMMARY — Core Primitives

## What was built

Four pure, deterministic modules under `packages/cli/src/core/`:

1. **pub-sub** (`createPubSub`) — typed channel bus with 100ms debounced snapshot emission. Methods: `publish`, `subscribe`, `last`, `snapshot`, `setFlushCallback`, `flush`, `dispose`.
2. **gesture-state** (`nextGesture`) — pure state machine that turns a stream of down/up events into `tap | dbl-tap | hold` results. Exports `HOLD_ACTION_DELAY_MS = 600` and `DOUBLE_TAP_DELAY_MS = 200`.
3. **store** (`createStore`) — per-addon and per-button scoped key-value stores with `get/set/update/clear/snapshot` and bulk clear helpers.
4. **pagination** (`paginate`) — splits a list into pages of `keyCount - 2` with `__nextPageMarker` insertion and null-padding for short final pages.

Also fixed four pre-existing typecheck errors uncovered during this plan's smoke:
- `addon/api.ts`: removed duplicate `AddonRegistry` interface (collided with `class AddonRegistry` in `registry.ts`); added `"info"` to `AddonLoadIssue.level` union.
- `addon/loader.ts`: the `info` level was already in use; the type narrowing now accepts it.
- `config/loader.ts`: dropped obsolete `{ maxAliasCount: 100 }` arg from `doc.toJSON()` (yaml v2 signature).
- `core/watcher.ts`: chokidar's `error` event payload narrowed to `unknown` in newer types; coerce to `Error` before forwarding to user handlers.

## Key files

- `packages/cli/src/core/pub-sub.ts` — channel bus (98 lines)
- `packages/cli/src/core/gesture-state.ts` — pure gesture state machine (130 lines)
- `packages/cli/src/core/store.ts` — scoped key-value store (60 lines)
- `packages/cli/src/core/pagination.ts` — list chunking (60 lines)
- `packages/cli/src/core/index.ts` — barrel
- `packages/cli/src/core/{pub-sub,gesture-state,store,pagination}.test.ts` — 38 tests

## Decisions made

- **Snapshot from Map**: spread `{ ...map }` doesn't work on Map; iterate explicitly into a plain object then `Object.freeze`. This bit both pub-sub and store.
- **Gesture state machine "tap at end of await-second"**: when events end in `await-second` state, emit tap. When events end in `down` or `second-down`, return `null` (await more events).
- **Gesture results are frozen**: results use spread + conditional spread for optional `keyIndex` (since `exactOptionalPropertyTypes: false`, optional spreads are safe).

## Bugs / adjustments during execution

- `Object.freeze({ ...bucket })` returned `{}` (Map spread doesn't iterate entries). Fixed.
- Gesture state machine didn't emit tap at end of `await-second`; only emitted dbl-tap mid-walk. Fixed.
- Readonly fields on `GestureResult` couldn't be mutated after construction; rewrote helpers to build result objects in one expression.

## Notes for downstream

- These four modules are the foundation for Plan 02 (action executor + runtime + methods) and Plan 03 (built-in addons + validation).
- All four are pure JS or thin Node wrappers — no React, no DOM, no addon contract imports. Safe to use from any layer.
- `core/index.ts` is the canonical import surface: `import { createPubSub, nextGesture, createStore, paginate } from "@/core"`.

## Smoke

- `pnpm exec vitest run` → 107/107 passing (8 cli + 38 config + 23 addon + 7 pub-sub + 11 gesture + 10 store + 10 pagination)
- `pnpm typecheck` → clean
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 71 files conform
