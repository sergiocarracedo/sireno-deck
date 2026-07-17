# Phase 6: Lock Deck - Context

**Gathered:** 2026-07-17
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

When the OS session provider reports `state === 'locked'`, the runtime enters a global **lock mode** that overrides every other deck (regular, overlay, transient). A single lock deck — built from `lock.buttons` in `config.yml` or, when absent, a 3-button time fallback (HH | `:` | MM) — is rendered. All gesture dispatches are suppressed in lock mode **except** `go-to-folder`, which is the only escape hatch: it exits lock mode and navigates normally. System buttons (back, settings-entry, overlay-toggle) are not injected while locked. Unlock reverts to the previous active deck and, if a window-triggered overlay's match is still active, resumes it.

`lock:` config block declares a user-defined lock deck (icons, labels, actions). Buttons can declare actions but every non-folder-nav action is dropped at the gesture-router layer.

Out of scope: animations on lock/unlock, custom lock-deck icons/labels beyond what `lock.buttons` allows, per-overlay re-lock on idle, manual lock-mode RPC for testing.

</domain>

<decisions>
## Implementation Decisions

### Layer model — mutex flag

- Runtime gains three pieces of state:
  - `lockActive: boolean` — true while session is locked
  - `preLockActiveDeckId: string | null` — the active deck id at the moment of locking (regular `navStack` top, transient, or overlay root) for restore
  - `preLockOverlayDeckId: string | null` — the overlay deck id (if any) at the moment of locking
- `getActiveDeckId()` checks `lockActive` first; if true, returns the lock deck id regardless of overlay/transient state.
- Overlay is **suspended, not cleared**: on lock we snapshot `overlayDeckId` into `preLockOverlayDeckId`. On unlock, if the active-app trigger for that overlay still matches, the overlay auto-resumes by calling `setOverlay(preLockOverlayDeckId, { source: "autoShow" })`. If the trigger no longer matches, the snapshot is cleared.
- Lock takes precedence over both regular and overlay layers — no exceptions.

### Activation source & lifecycle

- Lock mode is **session-provider-driven only**: subscribe to `HostSessionProvider` (already exposes `subscribe(listener)` and emits on `ActiveChanged`). No manual RPC, no config toggle.
- No debounce — every state change is honored immediately. `state === 'locked'` → enter lock; `state === 'unlocked'` → exit lock. Other states (`'unknown'`, `'unsupported'`) leave lock mode off.
- **Singleton id `lock:deck`**, **recreated on each lock cycle**:
  - On lock: build the deck (from `lock.buttons` if present, else default 3-button time deck), register it in `decks` as `lock:deck`, set `lockActive = true`, snapshot prior state.
  - On unlock: unregister the `lock:deck` entry, restore prior state, clear `lockActive`.

### User-button action permissions — gestures globally suppressed with escape hatch

- `lock.buttons` accepts the standard `ButtonSpec` shape (including `action`, `dispatch`, `macro` fields). No special schema stripping — users can write any action; the runtime filters.
- Gesture router (`runtime.gesture(...)` or equivalent entry point) gets a **pre-check** when `lockActive === true`:
  - If the button's resolved action is a `go-to-folder` (detect by macro type or a `core:go-to-folder` system-button type on the button): set `lockActive = false`, then **continue** with the normal gesture dispatch path (which navigates to the folder and re-injects system buttons on the next `injectSystemButtons` pass).
  - Otherwise: drop the gesture silently. No dispatch, no state mutation, no log spam.
- The folder escape hatch works because the pre-check runs **before** the suppression short-circuit, not after.

### Folder-escape re-lock semantics

- Once `lockActive` is cleared via `go-to-folder`, lock mode **stays off for the rest of the OS-locked period**. Only a fresh `state === 'locked'` event from the session provider re-activates lock mode.
- Rationale: the user explicitly opted out for the duration of this lock; surprising them with re-lock would defeat the purpose of the escape hatch.

### Default 3-button time layout

- When `lock.buttons` is empty/absent, the runtime builds a 3-button deck:
  - Position 0: `slot: 'hour'` — renders HH (e.g. "14")
  - Position 1: `slot: 'separator'` — renders ":"
  - Position 2: `slot: 'minute'` — renders MM (e.g. "35")
- Reuses the existing `core:locked-time-tile` button from `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/` (or `session:time` if that's the project's chosen path — confirm in research).
- Time source: **frontend wall clock** — each time tile uses its own `defaultIntervalMs` refresh interval (already implemented in `core:locked-time-tile`). Backend does not plumb a time stream.

### Config surface — `lock:` block at root

- Schema: `lock: z.object({ buttons: ButtonSpec.array().optional() }).strict().optional()` added to the existing root `configSchema` in `packages/cli/src/config/schemas.ts`.
- `.strict()` enforces unknown-key rejection at parse time (matches the project's zod conventions).
- **Backend-only**: lock config is consumed at startup when the runtime builds the deck list. The lock deck is published via the existing `deck-config` protocol message like any other deck. Frontend does not receive a `lockMode` flag — it just sees a deck with N time buttons and renders normally.
- No separate `lock.folder` field — folder navigation is configured inside `lock.buttons` like any other button (e.g. `dispatch: "go-to-folder://system"` or the project's macro equivalent).

### Agent's Discretion

- Exact `go-to-folder` detection: a new `core:go-to-folder` button type vs. a macro-name match. (Recommendation: use the existing folder-nav mechanism — whichever path the project already uses for regular folder buttons. The plan-phase researcher should confirm.)
- Layout of the default deck if the project decides `core:locked-time-tile` doesn't fit cleanly (e.g. switch to a single `core:clock` button — but only if the existing button's slots don't work).
- How the runtime surfaces the lock-active state to the gesture listener (push via pubSub `runtime:lock-mode` event vs. internal flag).

</decisions>

<specifics>
## Specific Ideas

- **Mutex over 3rd layer** — the user explicitly rejected "3rd layer (lock layer)" because of state-surface duplication. Mutex + snapshot restore was preferred.
- **Suspend overlay, don't clear** — the user picked "auto-resume" so prior overlay context is preserved across lock cycles if the trigger still matches.
- **Gestures globally suppressed** — even though config can declare any action, the gesture router is the gatekeeper. The user's mental model: "actions are disabled" is enforced at runtime, not at config-validation time.
- **No `lock.folder` shortcut** — the user said "remove lock.folder i dont know what is this". The folder-nav escape hatch is configured the same way as any other folder-nav button, just inside `lock.buttons`.
- **No debounce, no manual toggle** — keep activation strictly event-driven from the session provider.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 6 success criteria & tasks (authoritative scope).
- `.planning/phases/05-overlay-decks/05-CONTEXT.md` — established overlay-layer pattern that lock mode must coexist with.
- `.planning/phases/05-overlay-decks/05-DISCUSSION-LOG.md` — audit trail of prior decisions (per-overlay nav stack isolation, etc.).
- `packages/cli/src/deck/runtime.ts` — `createRuntime`, `getActiveDeckId`, `setOverlay`, `applyOverlay`, gesture entry point (where the lock-mode pre-check will plug in).
- `packages/cli/src/deck/system-back-injection.ts` — `computeSystemButtonForSlotN1`, `injectSystemButtons` (needs `lockActive` parameter).
- `packages/cli/src/system/providers/session/{linux,darwin,windows}.ts` — `HostSessionProvider` interface, `subscribe(listener)`, `getSnapshot()`.
- `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/` — the existing time tile button (reused for the default deck).
- `packages/cli/src/builtin-addons/session/decks/locked.ts` — current 5-button default; **needs to be reshaped to 3 buttons** OR replaced by a runtime-built default in this phase.
- `packages/cli/src/builtin-addons/session/index.ts` — where the existing `session:locked` deck factory is registered; if runtime builds the deck itself, this registration can stay (or move to backend-only).
- `packages/cli/src/config/schemas.ts` — root `configSchema` (where `lock:` will be added).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`core:locked-time-tile`** button (`packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/`): already accepts `slot: 'hour' | 'separator' | 'minute' | ...` and renders HH/MM with the frontend wall clock. Drop-in for the default 3-button deck.
- **`HostSessionProvider`** interface (`packages/cli/src/system/providers/session/`): already exposes `subscribe(listener)` and `getSnapshot()`. Lock-mode activation hooks into this — no new session provider code needed.
- **`setOverlay` / `getOverlay` / `hasOverlayDeckAvailable`** in runtime: already expose overlay state. Lock-mode suspend-and-resume composes with these (snapshot before lock, replay on unlock).
- **`computeSystemButtonForSlotN1` / `injectSystemButtons`**: trivial to extend with a `lockActive` flag — return `null` from `computeSystemButtonForSlotN1` when `lockActive === true`, so the n-1 injection is skipped entirely.

### Established Patterns

- **Zod `.strict()` for config schemas** — established in Phase 5; lock config follows the same pattern.
- **Per-deck nav stack isolation** (from Phase 5): the lock deck is a singleton with its own ephemeral state; we do **not** reuse the per-overlay stack pattern.
- **PubSub events for layer transitions**: existing events `runtime:overlay`, `runtime:activeDeck`, `runtime:deck-inactive` can be reused. Add one new event `runtime:lock-mode` (with `{ active: boolean }`) for downstream observability/tests if useful, but it's optional.
- **Backend-deck registration** via the deck-config protocol: the runtime already publishes dynamic decks (`applyOverlay` registers overlay decks at runtime). Lock-mode deck registration follows the same path.

### Integration Points

- `runtime.ts` is the single integration point for: `lockActive` flag, `preLock*` snapshots, `lock:deck` registration/unregistration, gesture-router pre-check, overlay suspend/resume.
- `system-back-injection.ts` needs a `lockActive` parameter — simplest change is to thread it through `injectSystemButtons` (and `RuntimeDeck` already has all the state needed; the caller passes `lockActive` from runtime).
- `config/schemas.ts` gains `lock: z.object({...}).strict().optional()` — one-line addition.
- Session-provider subscription wiring: in `createRuntime` or in the runtime options (where the `HostSessionProvider` is already injected per Phase 4/5), add a `subscribe` call that flips `lockActive` on state transitions.

</code_context>

<deferred>
## Deferred Ideas

- **Manual lock-mode RPC for testing** — a `runtime.lockMode(deckId | null)` method + protocol message. User explicitly chose session-only activation. Add later if UAT without physically locking the screen becomes annoying.
- **Animation / transition on lock/unlock** — was a nice-to-have in the ROADMAP; user did not select this in discussion. Visual polish phase.
- **`lock.folder` shortcut field** — user said "remove lock.folder i dont know what is this". Folder nav is configured inside `lock.buttons` like any other button.
- **Custom lock-deck icon/label override** beyond `lock.buttons` content — not selected.
- **Per-overlay re-lock on idle / back-to-root** — user picked "only on next OS lock". Reconsider if users complain.
- **Front-end dimming / lock badge** when lock mode is active — backend-only protocol plumbing was preferred. Reconsider if themes need to react.

</deferred>

---

*Phase: 06-lock-deck*
*Context gathered: 2026-07-17*