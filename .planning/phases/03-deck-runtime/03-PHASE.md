---
phase: 03-deck-runtime
status: ready-to-plan
depends_on: [02-config-addons]
---

# Phase 03 — Deck Runtime

Goal: the deck runtime that holds navigation state, overlay state, gesture machine, and registers the first three built-in addons (`core-buttons`, `internal-settings`, `session`).

## Outcomes

1. **Core primitives** (`src/core/`):
   - `pub-sub.ts` — typed channel bus; `publish(channel, payload)` and `subscribe(channel, cb)`; debounced state emission (100ms)
   - `gesture-state.ts` — gesture state machine: given raw down/up events with timestamps, emits `tap | dbl-tap | hold`. No `press-then-release`. Uses `HOLD_ACTION_DELAY_MS = 600`, `DOUBLE_TAP_DELAY_MS = 200`
   - `store.ts` — scoped per-button key-value store; methods `get/set/update/clear/snapshot`; `addon` scope and `button` scope
   - `pagination.ts` — chunk a list of buttons into pages of `keyCount - 2`; pad with empty slots; emit next-page metadata for slot `n-2`

2. **Deck runtime** (`src/deck/`):
   - `runtime.ts` — orchestrator: holds nav stack, active deck, overlay state, gesture state per button, mounted addon buttons
   - `system-back-injection.ts` — computes whether slot `n-1` should be replaced by a system button (`back`, `settings-entry`, or `overlay-toggle`) based on deck type + nav state
   - `system-decks/` — internal locked deck + internal settings deck (these are now defined by addons via `createDecks`, not hardcoded)
   - `system-buttons/` — `OverlayToggleButton`, `SystemSettingsEntryButton`, `TemporaryErrorButton`

3. **Action executor** (`src/action/`):
   - `executor.ts` — runs shell commands via `execa('/bin/sh', ['-c', command])` with `{{ host.* }}` placeholder interpolation; respects OS

4. **Built-in addons** (`src/builtin-addons/`):
   - `core-buttons/` — `core:action` (runs a command), `core:change-deck` (navigates to a deck), `core:toggle` (boolean toggle with store), `core:media-sample` (single button that displays a value from the addon store)
   - `internal-settings/` — `core:settings-*` buttons + `settings` deck via `createDecks`
   - `session/` — `core:session-info` button + `session:locked` deck via `createDecks`; publishes `session.locked` channel when the session monitor fires

5. **Config validation extension**:
   - After addon load, validate each button's `config` against its type's `configSchema` (this is the Phase 2 full-validation step)
   - Reject `internal: true` buttons when found in user config

6. **Tests** for: gesture machine (tap, dbl-tap, hold, edge cases), pagination chunking, store scoping, deck runtime nav + overlay, pub-sub debouncing, action executor with host interpolation, two-phase config validation.

## Requirements traceability

- **R6** (decks via `createDecks`) ✓ — used by `internal-settings` + `session`
- **R7** (core-buttons + internal-settings + session built-in addons) ✓
- **R8** (gesture state machine outputs only tap/dbl-tap/hold) ✓

## Dependencies

- `addons:core-buttons` → uses `methods.runCommand`, `methods.navigateToDeck`
- `addons:internal-settings` → uses `methods.runCommand` (brightness, etc.) + `createDecks`
- `addons:session` → uses `methods.publish` (session.locked) + `createDecks` + OS session monitor (Phase 07)

`methods.*` here refers to the per-button context surface. That contract is defined in `src/api/` (Phase 04) but the **runtime** in Phase 03 implements the methods. For Phase 03 the API surface can be local to `src/deck/methods.ts` and re-exported from `src/api/` in Phase 04.

## Files to create

```
src/core/
  pub-sub.ts
  pub-sub.test.ts
  gesture-state.ts
  gesture-state.test.ts
  store.ts
  store.test.ts
  pagination.ts
  pagination.test.ts
  index.ts

src/deck/
  runtime.ts
  runtime.test.ts
  system-back-injection.ts
  system-back-injection.test.ts
  methods.ts            # methods.* implementation
  system-decks/
    locked.ts
    settings.ts
  system-buttons/
    overlay-toggle.tsx
    settings-entry.tsx
    temporary-error.tsx
  index.ts

src/action/
  executor.ts
  executor.test.ts
  index.ts

src/builtin-addons/
  index.ts                  # registers all three built-in addons
  core-buttons/
    index.ts                # main module
    action.ts               # core:action button
    change-deck.ts          # core:change-deck button
    toggle.ts               # core:toggle button
    media-sample.ts         # core:media-sample button
  internal-settings/
    index.ts                # main module + createDecks for settings deck
    brightness.ts           # core:settings-brightness button
    theme.ts                # core:settings-theme button
    about.ts                # core:settings-about button
  session/
    index.ts                # main module + createDecks for locked deck
    session-info.ts         # core:session-info button
    time-button.tsx         # internal button used in locked deck
    locked-deck.ts          # createDecks impl

# validation extension (additions to existing files)
src/config/validation.ts    # add validateFull() that runs after addon load
src/config/loader.ts        # wire validateFull() into loadConfig({ addons })
src/__tests__/config-validation.test.ts  # tests for the new validation step
```

Estimated test count after Phase 03: **~110-130** (adding ~40-60 new tests).

## Success criteria

- [ ] All Phase 02 tests still pass (69/69)
- [ ] New tests: gesture machine (≥10), pagination (≥5), pub-sub (≥5), store (≥5), deck runtime (≥10), action executor (≥5), config full validation (≥5) — target total ≥110
- [ ] `pnpm typecheck` clean
- [ ] `pnpm --filter sireno-deck-2 lint` clean
- [ ] `pnpm format:check` clean
- [ ] `validateFull` rejects unknown `config` keys, rejects `internal: true` buttons in user config
- [ ] `session` addon publishes `session.locked` channel when session monitor fires (mock the monitor in tests)
- [ ] `internal-settings` addon `createDecks` returns a `settings` deck with at least `core:settings-brightness`, `core:settings-theme`, `core:settings-about`
- [ ] No `onPress`/`onRelease`/`onActivate`/`onDeactivate`/`poll`/`refresh` in any built-in addon (TDD-enforced via grep test)

## Constraints

- **No new dependencies** without explicit need. The runtime + built-in addons should only depend on packages already in `packages/cli/package.json` (`zod`, `execa`, `pino`).
- **No frontend yet.** Buttons can have `render: () => null` for Phase 03; the actual React render ships in Phase 04.
- **Gesture machine must be deterministic** — given timestamps, the output must be a pure function. Tests should pin timestamps.
- **`session.locked` channel** must be debounced (100ms) so multiple monitor events don't flood subscribers.

## Open questions to resolve during planning

1. Should the gesture machine output also include `timestamp` and `keyIndex`? (likely yes — needed for analytics later)
2. Should `methods.runCommand` stream stdout to logs or only return the final result? (start with sync; async streaming later)
3. Where does the action executor's sandbox live? (Phase 03: direct exec; future: optional allowlist)
4. Should the `core:change-deck` button's `addToHistory` default to `true`? (yes, matches legacy)
5. Should `core:action` accept a list of commands to run in sequence? (start with single command)

These are listed for the planner to address during `/plan-phase 03`.
