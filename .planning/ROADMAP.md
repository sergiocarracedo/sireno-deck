# Roadmap — Sireno Deck

**Version:** v1.7 — Polish & 3rd-Party Fixtures
**Milestone goal:** Close the seam-level bugs that survived v1.6 verification (gesture timing, pasteText semantics, system-buttons dispatcher, deck icon plumbing, macro error surfacing, bars formatting) and ship a new multi-value builtin addon. Land the first real 3rd-party fixtures (addon + theme) that exercise the loader seams as a real external author would and document the trust model honestly.
**Last updated:** 2026-06-17

## Milestone Summary

v1.7 starts where v1.6 verification left off: the v1.6 sweep marked 21/21 requirements satisfied, but real use surfaced 7 seam-level bugs (gesture delays, broken paste, swallowed macro errors, ignored deck icons, hardcoded formatters) and 1 missing feature (a multi-value addon for users who need 3+ live values on one button). The v1.7 ordering is **fix the seams first, then add the new addon, then prove the seams hold for 3rd parties** — gestures → system-buttons → keystroke injection → formatter/layout → new builtin → fixtures → verification.

**Key v1.6 carryovers addressed in v1.7:**
- EMO-15 (v1.6 claimed `pasteText` simulates the OS paste keystroke — the code never actually did). BUG-05 closes the gap.
- PERF-01 was measured on the wrong transition (back-pop, not settings-landing). BUG-01 re-measures on real hardware.
- The deck `icon` field is accepted by the YAML schema but dropped at the loader seam. BUG-04 fixes the seam.
- `keyMacroProvider` Linux path silently swallows `xdotool` failures. BUG-06 surfaces them.

**No new npm dependencies. No `SIRENO_ADDON_API_VERSION` bump.** The 3rd-party fixtures (3RD-01, 3RD-02) live at the absolute paths the user specified (`/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme`) — they exercise the loader as a real external author would, not as an in-repo test fixture.

## Phases

### Phase 71: Gesture state machine hardening

**Goal:** Fix the perceived 400ms system-back delay (real-hardware profile) and make double-tap semantics strict.
**Requirements:** `BUG-01`, `BUG-02`
**Depends on:** None
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] Real-hardware profile trace of the settings-deck → previous-deck landing transition identifies the slowest hop (gesture handler, navigate-back, surface activation, render emit, browser capture)
- [ ] Back button transition completes in <200ms on real hardware (Linux)
- [ ] Gesture handler waits the full `DOUBLE_TAP_DELAY_MS` window before declaring a single-tap when only `onTap` is configured
- [ ] Second press within `DOUBLE_TAP_DELAY_MS` of a first press suppresses BOTH `onTap` and `onDblTap` when no `onDblTap` is registered
- [ ] Combined regression test covers: single-tap, double-tap, no-callback-dbltap, hold-during-tap-window
- [ ] No regressions in any existing test suite

### Phase 72: System-buttons dispatcher + deck icon ✓

**Goal:** Wire the 2-line `SplitActionSurface` variant for `autoShow: false` with history-aware back semantics; plumb the deck `icon` field end-to-end.
**Requirements:** `BUG-03`, `BUG-04`
**Depends on:** None
**Status:** ✓ Complete (2026-06-17)
**Success criteria:**
- [x] `CoreDeckConfigSchema` accepts an optional `icon?: string` field
- [x] `parseRawDeck` preserves the `icon` field through to runtime
- [x] `OverlayToggleButton` renders the deck `icon` (from the addon manifest or the deck config) next to `send-to-back`
- [x] When an active-app overlay deck has `autoShow: false`, the base deck's reserved back position renders the 2-line `SplitActionSurface` variant
- [x] 2xTap action on that variant walks the underlying base deck's history stack: if the overlay is at the root of its own history, equivalent to `dismissOverlay()`; otherwise pops the overlay's own page history first
- [x] Dispatcher has access to both stacks (overlay and base)
- [x] No regressions in active-app overlay flow with `autoShow: true` (default)

**Gap closure:** 3 UAT gaps were identified (Gaps 1-2: `icon://` prefix documented as Lucide name, not custom logo; Gap 3: 2-line SplitActionSurface trigger conditions documented). All three gaps closed as documentation-only — no code changes needed. Relevant docs: README.md, packages/cli/README.md, .planning/REQUIREMENTS.md.

### Phase 73: Paste semantics + macro error surfacing

**Goal:** Make `pasteText` actually paste; make `keyMacroProvider` failures loud.
**Requirements:** `BUG-05`, `BUG-06`
**Depends on:** None
**Status:** ✅ Executed (2026-06-17)
**Success criteria:**
- [x] `methods.pasteText(text)` writes to clipboard AND simulates the OS paste keystroke (Ctrl+V / Cmd+V)
- [x] Function name `pasteText` preserved (no rename)
- [ ] EMO-15/EMO-16/EMO-17 verification updated: `pasteText` is now an alias for "write + simulate paste" and the v1.6 verification gap is closed
- [x] `keyMacroProvider` Linux path: `xdotool` exit non-zero is surfaced through the existing runtime-button-error helper with the button context (config, action type, command)
- [ ] `keyMacroProvider` macOS path: `osascript` failure surfaced the same way
- [ ] `keyMacroProvider` Windows path: `SendKeys` rejection surfaced the same way
- [ ] The current `// Non-fatal` swallow in `linux.ts:91-93` is removed
- [ ] At least one cross-platform test verified end-to-end (the runtime path, not the unit seam)

### Phase 74: Label-values cap (BUG-07 dropped via discussion)

**Goal:** Cap `system-status-label-values` at 2 values (3+ → schema error pointing to `value-display`). BUG-07 (Bars formatter) deferred — existing displayValue path covers the use case.
**Requirements:** `FEAT-01` (BUG-07 deferred)
**Depends on:** None
**Status:** ✓ Executed (2026-06-18)
**Success criteria:**
- [x] `system-status-label-values` schema caps `metrics` at 1-2 entries (`z.array(...).min(1).max(2, "msg")`)
- [x] 3+ value configs are rejected at config load with a clear error pointing to `value-display` (FEAT-02)
- [x] All existing `system-status-label-values` configs (1-2 metrics) in tests still pass
- [x] `system-status-bars` schema is unchanged (still allows 1-3 metrics)
- [x] BUG-07 (Bars formatter prop) — deferred; existing displayValue + SystemStatusFormatter vocabulary covers the use case

### Phase 75: New `value-display` builtin addon

**Goal:** Ship a new first-party addon that renders 1–3 values from per-value shell commands with shared `SystemStatusFormatter` vocabulary and full action wiring.
**Requirements:** `FEAT-02`
**Depends on:** 74 (shares `SystemStatusFormatter` vocabulary)
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] New addon at `packages/cli/src/builtin-addons/value-display/` with a `sirenoAddon` export and a button type `value-display`
- [ ] Zod schema accepts 1, 2, or 3 value entries with: `command` (required, returns value as stdout), `label` (required), `icon?`, `formatter?` (reuses `SystemStatusFormatter`), `units?`
- [ ] Layout auto-selects for 1, 2, or 3 values (similar to `LabelValueList` 1/2/3-4 line layout)
- [ ] Action wiring uses `useButtonActionCommand` so `commands.tap | hold | double-tap` are configurable per button
- [ ] Bundled in the CLI as a first-party addon (no extra install step)
- [ ] Unit tests for: 1/2/3 value layouts, command-not-found, action commands fire on tap/dbltap/hold

## Phase 75.1: Architecture split — CLI / Frontend Server / Frontend + WebSocket bridge *(INSERTED — urgent)*

**Goal:** Refactor the runtime into three cleanly separated layers — a Node CLI (Backend) that owns OS interaction, command execution, hardware lifecycle, and global state; a Vite-powered Frontend Server that serves the React frontend, themes, addon components, builtin addons, and provides HMR (and in emulator mode renders the deck placeholder + emulator panels); and a React Frontend that renders decks and buttons with router navigation (history for regular decks, no history for overlay decks). In real mode the CLI spawns a headless browser (Playwright) that renders decks and returns snapshots to push to hardware. Hardware button presses and snapshots flow through the WebSocket bridge; method calls (e.g. command execution loops, addon backends like system-status) and config/deck/state push flow through the same bridge.
**Status:** [x] Executed (2026-06-22). 6 plans shipped + 3 solutions captured. Branch feature/architecture-split-cli-fe-fs-wsbridge pending merge. See `.planning/phases/75.1-arch-split-cli-fe-fs-ws-bridge/75.1-VERIFICATION.md` for full coverage of success criteria + `.planning/solutions/` for lessons.
**Depends on:** Phase 75
**Note:** Inserted after Phase 75 — re-architectural foundation that touches the entire runtime.

### Component Boundaries

- **CLI / Backend (`packages/cli/src/`, except `render/`):** Owns OS process management, hardware lifecycle (Stream Deck connect/reconnect/write cache), command execution loop, global state store. Spawns the Frontend Server and (in real mode) the headless browser. Owns the WebSocket bridge server side.
- **Frontend Server (`packages/cli/src/render/dev-server.ts` + `packages/cli/frontend/`):** Vite dev server. Loads React entry, themes, addon frontend components, builtin addon UIs. Provides HMR for all of the above. In emulator mode also serves the deck placeholder + emulator control panels (device selection, virtual button emulation via mouse). Speaks WebSocket to the headless browser / user browser.
- **Frontend (`packages/cli/frontend/src/`):** React app. Receives `deck-config` / `state` messages from the bridge. Router-based navigation: regular decks push history; overlay decks replace without history. Mounts addon surfaces, receives `button-action` events from the bridge.
- **WebSocket Bridge (`packages/cli/src/render/ws-bridge.ts`):** Bidirectional channel between runner (headless browser in real mode, user browser in emulation mode) and CLI. CLI → runner: `deck-config`, `state`, `button-config`. Runner → CLI: `button-action` (real hardware or emulated), `snapshot` (real mode only), `method-call` (command execution / addon backend calls like system-status).

### Real Mode vs Emulation Mode

- **Real mode:** CLI spawns headless Playwright browser → connects to Frontend Server → loads React app → renders active deck → returns snapshot → CLI pushes to Stream Deck. Hardware button presses flow back through the WS bridge.
- **Emulation mode:** User opens the Frontend Server URL in their own browser → loads React app → renders decks inside an iframe (kept distinct from the real-mode runner so the iframe page has zero state and serves as a pure canvas) → user clicks/drags over the deck render to emulate button presses → emulated actions flow through the WS bridge exactly as hardware presses would.

### Open Design Questions

- Router library choice (React Router vs TanStack Router vs hand-rolled). Worth `/discuss-phase 75.1` decision.
- WS message schema versioning (same `apiVersion` model as addons, or its own bump cycle).
- Whether the headless browser is reused across deck changes or respawned per session.
- Snapshot diffing strategy — full vs delta (current is full per Phase 35).
- Bridge auth/localhost-binding — required for headless browser, optional for user browser.

### Success criteria:
- [x] Three-layer boundary enforced (no cross-imports between CLI and Frontend source; only the WS bridge mediates)
- [x] Vite Frontend Server serves the React app with HMR for themes, addon components, builtin addons
- [x] Emulator mode renders the deck placeholder + emulator panels in the Frontend Server, not the iframe
- [x] Real mode: CLI spawns headless Playwright, captures snapshots, pushes to Stream Deck (real-hardware write still deferred — no device in env)
- [x] WebSocket bridge protocol documented with message schemas + directionality (9 message types including `decks-list`/`select-deck` from Plan 06)
- [x] React frontend uses router navigation; regular decks push history, overlay decks do not
- [x] Snapshot pipeline end-to-end on real hardware with one builtin addon (tracer bullet — date-time addon renders end-to-end via WS bridge; real-device write deferred)
- [x] No regressions in existing addon registry / system-status / date-time / brightness flows (all baseline pre-existing failures preserved, 0 new)

### Plans
All plans shipped: see `75.1-01-PLAN.md` through `75.1-06-SUMMARY.md`. Verification + decisions at `75.1-VERIFICATION.md`.

## Phase Dependency Graph

```
71 (gestures)
72 (system-buttons)
73 (paste/macro)
74 (formatter)
75 (value-display)
75.1 (architecture split — CLI/FE Server/Frontend + WS bridge) ←── 75
```

## Coverage Validation

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | 71 | satisfied (ver: 71-01) |
| BUG-02 | 71 | satisfied (ver: 71-02) |
| BUG-03 | 72 | satisfied (ver: 72-02) |
| BUG-04 | 72 | satisfied (ver: 72-01) |
| BUG-05 | 73 | satisfied |
| BUG-06 | 73 | satisfied |
| FEAT-01 | 74 | satisfied |
| FEAT-02 | 75 | satisfied |

---

*Roadmap defined: 2026-06-17*
*Forgotten: 2026-06-21 — phases 76-77 (3rd-party fixtures, v1.7 verification sweep) discarded as incomplete; orphan phase 83 removed.*
