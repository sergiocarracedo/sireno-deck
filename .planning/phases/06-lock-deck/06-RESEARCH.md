# Phase 6: Lock Deck - Research

**Status:** Researched 2026-07-17
**Confidence:** HIGH (codebase scan) / LOW (external — not needed, internal-architecture phase)

## Summary

Phase 6 wires a global **lock mode** into the runtime that takes precedence over regular + overlay deck layers, driven by `SessionProvider` state changes. CONTEXT.md locked the major decisions; this research maps them to existing code patterns and surfaces two structural issues that need to be addressed in planning.

## Don't Hand-Roll

| Need | Reuse | Why |
|------|-------|-----|
| Time tile rendering | `date-time:locked-time-tile` (`packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/`) | Already accepts `slot: 'hour' \| 'separator' \| 'minute'`, frontend uses `useNow(1000)` wall clock. Drop-in for the default 3-button lock deck. |
| Session state subscription | `SessionProvider.subscribe(handler)` (`packages/cli/src/system/providers/session.ts`) | Already exposes `subscribe` + `getState`. Lock mode just plugs into the existing publisher. |
| Overlay layer management | `setOverlay` / `getOverlay` / `hasOverlayDeckAvailable` in `runtime.ts` | Existing overlay suspend/resume composition: snapshot `overlayDeckId` on lock, replay via `setOverlay(..., { source: "autoShow" })` on unlock if the trigger still matches. |
| Runtime gesture entry | `dispatchGesture` → `invokeAction` (`runtime.ts:439-450, 326-437`) | Pre-check hook for lock-mode suppression belongs at the top of `invokeAction` (before user-action dispatch and handler resolution). |
| System-button suppression | `computeSystemButtonForSlotN1` (`system-back-injection.ts:20-26`) | Already a single decision point for the n-1 button. Adding `lockActive` as a return-`null` trigger is one-line. |
| Config validation | `RawConfigSchema` + `ButtonDefSchema` in `config/schemas.ts` | Reuse `ButtonDefSchema` for `lock.buttons[]`. Use existing `.strict()` + `.optional()` convention. |

## Common Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| **Lock deck registered as a regular deck** — would compete with overlay + nav stack instead of overriding them. | Build the `lock:deck` *singleton* inside the runtime, registered on lock, unregistered on unlock. NOT loaded through `loadConfig` / `Object.entries(config.decks)`. |
| **Overlay clear-on-lock vs suspend-on-lock** — clearing would lose the user's overlay context permanently. | CONTEXT.md locked **suspend** + auto-resume-on-unlock-if-trigger-matches. Snapshot `overlayDeckId` to `preLockOverlayDeckId` on lock; replay via `setOverlay(..., {source:'autoShow'})` on unlock. |
| **Gesture pre-check after dispatch path** — suppression has to fire BEFORE `getMethods().dispatch(userAction)` is awaited. | Place the lock-mode pre-check inside `invokeAction` (or its caller) at the very top, before the `userAction` branch (runtime.ts:386). |
| **`session.locked_deck` schema field is orphaned** — schema declares it (`config/schemas.ts:91`) but nothing consumes it. Phase 6 introduces a new `lock:` block. Leaving `session.locked_deck` in the schema would be confusing. | Plan includes: remove `session.locked_deck` + the related `SessionSchema` type. Update `config/__tests__/validation.test.ts:29` fixture. |
| **Existing `session:locked` deck has a broken button** — `session:time` button renders `NullButton` (frontend.tsx), so the current 5-button lock deck is visually empty. | Phase 6 either replaces the `session:locked` factory or removes it (the runtime now builds the default lock deck using `date-time:locked-time-tile`). |
| **Re-locking on idle** — `linux.ts:83` republishes `"unlocked"` when idle exceeds `idleMs`. This is not a real lock event but currently emits `unlocked` (not `locked`). | Out of scope per CONTEXT.md ("Per-overlay re-lock on idle / back-to-root — user picked 'only on next OS lock'"). The session provider behavior is left alone. |
| **Lock deck ID collision** — if a user names a deck `lock:deck` in config, runtime registration would clobber it. | The runtime uses a reserved ID constant; document it as reserved (don't add a config-level validation since the runtime can guard against collision at register time — log + ignore if a user-declared deck with id `lock:deck` exists). |
| **Test for "default 3-button time deck" without a clock** — `useNow(1000)` would require fake timers in unit tests. | Backend tests assert the deck shape (button types + slot configs). Render-side (HH/MM formatting) already has its own tests in `date-time/`. |
| **Config schema test fixture still references `session.locked_deck`** — `validation.test.ts:29` has `session: { locked_deck: "session:locked" }`. | Update fixture when removing `session.locked_deck`. |

## Existing Patterns in This Codebase

### Runtime extension pattern (from Phase 5)

Phase 5 added `overlayDeckId`, `overlayPreviousActiveId`, `overlayNavStacks` as closure-local state inside `createRuntime`. Phase 6 follows the same pattern:

- Closure-local `lockActive`, `preLockActiveDeckId`, `preLockOverlayDeckId` inside `createRuntime`.
- Mutation happens at well-defined seams: `subscribeSession(...)` handler, gesture-router pre-check, unlock handler.
- Expose via the `Runtime` interface (e.g. `isLockActive()`, `setLockActive(boolean)`) for tests.

### Dynamic deck registration

The runtime already publishes decks via `deck-config` protocol messages from `run.ts:725-748` (built per active deck). The `Runtime.decks` array is **not** mutated post-creation — the existing overlay runtime overlays decks at runtime via `setOverlay`, but the underlying `decks` array stays fixed.

For the lock deck, we have two options:
- **Option A (preferred):** Mutate the closure-local `decks` array — push `lock:deck` on lock, splice on unlock. `deckById` picks it up. The `getActiveDeckId()` returns `lock:deck` when `lockActive`.
- **Option B:** Build `lock:deck` separately and let `getActiveDeck()` short-circuit when `lockActive`. `deckById('lock:deck')` returns the synthesized deck.

**Recommendation: Option B.** Cleaner separation; no array mutation; the deck is ephemeral by design. `findButton` already falls back to a `colonIdx`-split lookup (runtime.ts:120-138) — works for `lock:deck` lookups too.

### Session provider injection

`run.ts:589-598` builds `activeApp`, `session`, `keyMacro` providers, then wires `activeApp` via `runtime.setActiveAppProvider(activeApp)`. The `session` provider is currently **not wired into the runtime** — it's passed back in the bundle but unused (Phase 5 left a TODO here).

Phase 6 must add `runtime.setSessionProvider(session)` (mirroring `setActiveAppProvider`) and call it in `startSystemProviders`.

### Gesture routing

`invokeAction(buttonId, gesture)` (runtime.ts:326-437) does:
1. `findButton(buttonId)` — find button + deck
2. Resolve `userAction` from `actions.tap/dbltap/hold` (or handler fallback)
3. `checkRequirement(capability)` — guard against missing system capability
4. `getMethods().dispatch(userAction)` — run user action

The lock-mode pre-check belongs at step 2 (after `findButton` returns, before `userAction` is honored): if `lockActive && deck.id === 'lock:deck'`, evaluate whether the action is a `go-to-folder` escape — if yes, set `lockActive = false` and **continue** (which makes `getActiveDeck()` return the regular deck immediately, but the navigation should proceed). If no, return early.

### Config schema patterns

`config/schemas.ts` uses:
- `z.object(...).strict()` for all object schemas (unknown keys rejected)
- `.optional()` for fields that may be absent
- `.refine(...)` only for cross-field invariants (e.g. trigger requires at least one of `process_name`/`window_name`)

The new `lock` block follows the same shape:
```ts
export const LockSchema = z
  .object({
    buttons: z.array(ButtonDefSchema).optional(),
  })
  .strict()
  .optional()
```

The root `RawConfigSchema` gains a `lock: LockSchema` field. Tests in `validation.test.ts` need the `session.locked_deck` fixture updated.

## Recommended Approach

### Slice structure (vertical tracer bullets)

| Plan | Wave | Demoable deliverable |
|------|------|---------------------|
| `06-01-PLAN.md` | 1 | Lock OS → 3-button HH:MM deck appears; unlock → main deck restored. No user config. |
| `06-02-PLAN.md` | 2 | With `lock.buttons:` configured, OS locks → custom buttons render; non-folder actions are dropped; `go-to-folder` exits lock and navigates. |
| `06-03-PLAN.md` | 3 | Overlay deck active → OS locks → unlock → overlay auto-resumes (if trigger still matches) and prior nav stack restored. |

### Plan 01 outline

1. **Schema:** add `LockSchema` + `lock:` to `RawConfigSchema`. Update `validation.test.ts` fixture (remove `session.locked_deck`).
2. **Runtime state:** closure-local `lockActive`, `preLockActiveDeckId`, `preLockOverlayDeckId` inside `createRuntime`. Expose `isLockActive(): boolean` on `Runtime` interface.
3. **`getActiveDeckId()`:** check `lockActive` first — return `'lock:deck'` if true (or the synthesized deck).
4. **`getActiveDeck()`:** synthesize the default `lock:deck` when `lockActive` and `config.lock?.buttons` is absent: 3 buttons (`date-time:locked-time-tile` with `slot: 'hour' | 'separator' | 'minute'`).
5. **`system-back-injection.ts`:** accept `lockActive` parameter; `computeSystemButtonForSlotN1` returns `null` when locked.
6. **Session provider wiring:** add `setSessionProvider(provider: SessionProvider)` to `Runtime`; subscribe in `createRuntime` and toggle `lockActive` on `state === 'locked'`. Subscribe path: snapshot pre-lock state, register/unregister `lock:deck` is a no-op for plan 01 since the deck is synthesized.
7. **Wire in `run.ts`:** pass `session` into `runtime.setSessionProvider(session)` (currently dangling).
8. **Tests:**
   - `runtime.test.ts`: lock mode → `getActiveDeckId()` returns `'lock:deck'`; default lock deck has 3 buttons with correct slots.
   - `system-back-injection.test.ts`: `lockActive=true` → `injectSystemButtons` produces no n-1 button.
   - `session-listener.test.ts`: feeding `state: 'locked'` event flips `lockActive`; `state: 'unlocked'` flips back.
   - `validation.test.ts`: `lock: { buttons: [...] }` and `lock: {}` both validate.

### Plan 02 outline

1. **Config → deck builder:** `buildUserLockDeck(buttons: ButtonDef[]): RuntimeDeck` returns a `lock:deck` with the user's buttons (each gets a position-derived id).
2. **`getActiveDeck()`:** if `config.lock?.buttons` non-empty, use `buildUserLockDeck`; else default 3-button.
3. **Gesture pre-check in `invokeAction`:** if `lockActive && deck.id === 'lock:deck'`:
   - Resolve `userAction` from `actions.tap/dbltap/hold`.
   - Detect `go-to-folder`: check macro dispatch prefix `go-to-folder://` OR `navigate://<deckId>` OR direct `navigateToDeck` from a handler. (Recommend: detect by `userAction` string startsWith `navigate://` or by button.type === `core:change-deck` — whichever matches the project's existing folder-nav convention.)
   - If folder-escape: set `lockActive = false`, then `return` to let the **existing** dispatch path run (which calls `getMethods().dispatch` and handles `navigateToDeck`).
   - Else: return early (no dispatch, no error).
4. **Tests:**
   - User-defined lock deck renders from `lock.buttons`.
   - `dispatchGesture` on a user lock button with `actions.tap: 'paste://test'` does NOT call `dispatch`.
   - `dispatchGesture` on a user lock button with `actions.tap: 'navigate://system'` calls `dispatch`, sets `lockActive=false`, and `getActiveDeckId()` returns the navigated deck.

### Plan 03 outline

1. **On lock entry:** snapshot `preLockOverlayDeckId = overlayDeckId` + `preLockActiveDeckId = getActiveDeckId()` (the regular layer's active deck, including transient).
2. **On unlock:**
   - If `preLockOverlayDeckId !== null`: clear `lockActive`, then check `computeOverlayFor(currentSnapshot)` — if it returns the same id, call `setOverlay(preLockOverlayDeckId, {source:'autoShow'})`.
   - Else: call `navigateToDeck(preLockActiveDeckId, {addToHistory: false})` to restore the prior active deck.
3. **Overlay already-active-when-locked edge case:** when lock activates while overlay is showing, `getActiveDeck()` returns lock deck, but `overlayDeckId` stays non-null. Snapshot captures the overlay id. Unlock replays it.
4. **Nav stack restore:** `preLockActiveDeckId` may be transient — pass `addToHistory: false` to avoid pushing on the regular stack.
5. **Tests:**
   - Overlay active + OS locks + OS unlocks → overlay resumes (mock `computeOverlayFor` to return the same id).
   - Overlay active + OS locks + OS unlocks but trigger no longer matches → overlay dismissed; regular deck restored.
   - No overlay + OS locks + OS unlocks → regular deck restored.
   - Lock-then-folder-escape then OS unlocks → still on folder deck, no re-lock (re-lock requires fresh OS event).

### Open questions for planner

1. **go-to-folder detection mechanism:** Use existing `navigate://` dispatch prefix, or add a new `core:go-to-folder` button type? Recommendation: detect by `userAction` prefix — matches existing dispatch conventions, no new button type needed. The button type `core:change-deck` with a deck config is the existing way to navigate; lock buttons use the same.
2. **Re-lock window after folder escape:** per CONTEXT.md, `lockActive` stays off until the next OS event. Implementation: in the unlock handler, do NOT call `setLockActive(false)` if it was already cleared by escape — only honor OS-driven state changes.
3. **Test approach for session subscription:** Mock `SessionProvider` with a controllable `subscribe` (returns `(state) => void` control). Existing test patterns in `session/__tests__/linux.test.ts` use similar mocks.

## Canonical References

- `.planning/ROADMAP.md` — Phase 6 scope (REQ-011..016)
- `.planning/phases/06-lock-deck/06-CONTEXT.md` — locked user decisions
- `.planning/phases/05-overlay-decks/05-CONTEXT.md` — overlay pattern that lock coexists with
- `packages/cli/src/deck/runtime.ts` — `createRuntime`, `getActiveDeckId`, `setOverlay`, `applyOverlay`, `invokeAction`, `dispatchGesture`
- `packages/cli/src/deck/system-back-injection.ts` — `computeSystemButtonForSlotN1`, `injectSystemButtons`
- `packages/cli/src/deck/methods.ts` — `Methods` interface (no changes needed; pre-check lives in runtime)
- `packages/cli/src/config/schemas.ts` — `RawConfigSchema`, `ButtonDefSchema`, `SessionSchema` (orphan to remove)
- `packages/cli/src/system/providers/session.ts` — `SessionProvider` interface, `SessionState = 'locked' | 'unlocked' | 'unknown'`
- `packages/cli/src/system/providers/session/linux.ts` — reference impl with `subscribe`
- `packages/cli/src/cli/commands/run.ts` — `startSystemProviders`, `loadConfigAndTheme`, `session` is currently dangling
- `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/` — default time tile button
- `packages/cli/src/builtin-addons/session/decks/locked.ts` — current broken 5-button lock deck (replace or remove)

## Decisions Honored from CONTEXT.md

- ✅ Mutex flag (`lockActive`) — not a 3rd layer
- ✅ Session-provider-driven only — no manual RPC
- ✅ Singleton id `lock:deck`, rebuilt per cycle
- ✅ `lock.buttons` accepts full ButtonSpec, gestures suppressed globally except `go-to-folder`
- ✅ Folder escape persists until next OS-lock event
- ✅ Default 3-button HH | `:` | MM using existing `date-time:locked-time-tile` slots
- ✅ `lock: z.object({...}).strict().optional()` at root, backend-only
- ✅ No `lock.folder` shortcut

## Source Confidence

| Claim | Confidence | Source |
|-------|------------|--------|
| `SessionProvider.subscribe` interface | HIGH | `providers/session.ts:7-11` |
| Runtime gesture entry point | HIGH | `runtime.ts:439-450` |
| `system-back-injection` extension point | HIGH | `system-back-injection.ts:20-26` |
| `date-time:locked-time-tile` slot set | HIGH | `date-time/buttons/locked-time-tile/frontend.tsx:8-16` |
| `session.locked_deck` is orphaned | HIGH | `grep -rn locked_deck` returns only the schema line |
| `session:time` button renders NullButton | HIGH | `session/buttons/time/frontend.tsx` |
| Session provider not yet wired into runtime | HIGH | `grep -n setSessionProvider runtime.ts` returns nothing |

Web research skipped — this is an internal-architecture phase that reuses established codebase patterns. No external libraries or APIs involved.