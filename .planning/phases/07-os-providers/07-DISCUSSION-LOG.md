---
phase: 07-os-providers
status: complete
mode: standard
gathered: 2026-06-24
---

# Phase 07: OS Providers — Discussion Log

Audit log of decisions made during discuss-phase. Read by humans only; downstream agents read `07-CONTEXT.md`.

---

## A. Provider interface scope

### A.1 Active-app shape

**Options considered:**
1. (Recommended) `{ name, windowTitle, processId }` — matches legacy provider, all platforms expose it
2. `{ name }` only — minimal, but too thin for window-title-based matching
3. `{ name, pid, windowTitle, icon }` — adds platform-specific icon code

**User choice:** Option 1 (`name + windowTitle + processId`).

**Rationale captured:** Standard "what's the user doing" info, exposed by all three platforms (D-Bus / AppleScript / UIA).

### A.2 Session-monitor events

**Options considered:**
1. (Recommended) `locked + unlocked + idle` — idle useful for system-status addon (LED off)
2. `locked + unlocked` only — minimal
3. `locked + unlocked + idle + suspend/resume` — suspend detection flaky on D-Bus

**User choice:** Option 1 (`locked + unlocked + idle`).

**Rationale captured:** Idle event lets the `system-status` addon save power by blanking LEDs.

### A.3 Key-macro interface

**Options considered:**
1. (Recommended) `sendKey(comboOrText)` — combo format for modifiers+keys, literal text (including emojis) for plain input
2. `sendKey(combo) + typeText + sendMouse` — mouse is hairy on Wayland
3. `sendKey(combo[]) batch + chain` — complex parser, mostly unused

**User choice:** Option 1, with explicit clarification: *"but if you confirm i can send emojis"*.

**Rationale captured:** User wants emoji payloads to be sendable through `sendKey` (passthrough, not parsed). This matches `xdotool key` / `osascript keystroke` natural behavior. Confirmed in CONTEXT.md A.3.

### A.4 Media player scope

**Options considered:**
1. (Recommended) Transport only — `play/pause/toggle/next/previous`. No metadata.
2. Transport + `getCurrent()` metadata
3. Transport + metadata + `onChange(handler)` events

**User choice:** Option 3 (full: transport + metadata + onChange).

**Rationale captured:** User wants live track display; `media-player` addon (Phase 09) consumes it directly.

---

## B. Linux key-macro provider selection

### B.1 Probe order

**Options considered:**
1. (Recommended) Probe `xdotool → ydotool → dotool` once at init, use first found
2. Hard-code `xdotool` only — breaks on Wayland
3. Run all three in parallel — overkill

**User choice:** Option 1.

**Rationale captured:** Standard fallback chain; matches legacy `linux.ts` xdotool/ydotool probe logic.

### B.2 Active-app D-Bus strategy

**Options considered:**
1. (Recommended) D-Bus first, `/proc` fallback — single code path covers X11 and gnome-Wayland
2. D-Bus only — fails for pure X11
3. Separate X11 vs Wayland impls — more files, more tests

**User choice:** Option 1 (D-Bus first, /proc fallback).

**Rationale captured:** Simpler implementation; matches the Linux "tools" the user already runs (D-Bus on Wayland gnome, xdotool as fallback).

---

## C. Failure mode

### C.1 Init failure

**Options considered:**
1. (Recommended) Log warn + null provider — clear log, no crash, addon sees warning
2. Hard fail at startup — blocks working installs
3. Silent no-op — masks config issues

**User choice:** Option 1 (log warn + null provider).

**Rationale captured:** "If a tool is missing, warn but don't crash" — user explicitly stated preference; partial functionality is acceptable.

### C.2 Per-call failure

**Options considered:**
1. (Recommended) Reject with typed `ProviderError` (`.code`)
2. Resolve to `{ ok: false, error }`
3. Log and swallow

**User choice:** Option 1 (reject with typed error).

**Rationale captured:** Caller decides what to do (action executor catches + logs); no silent swallowing.

---

## D. process_names matching for overlay decks

### D.1 Match language

**Options considered:**
1. (Recommended) Substring, case-insensitive — user's `'chrome'` works out of the box
2. Exact match — user must write `'Google Chrome'`
3. Glob patterns — powerful, more parser

**User choice:** Option 3 (glob patterns).

**Rationale captured:** Power-user friendly. `*` wildcards and `|` alternation. Substring is the simplest case (no glob chars = exact substring).

### D.2 Where matching lives

**Options considered:**
1. (Recommended) Runtime layer (Phase 03)
2. Provider layer
3. Addon-side

**User choice:** "is runtime part of cli/backend?" — confirmed yes, then Option 1.

**Rationale captured:** User asked for clarification on architecture. Confirmed: runtime is in `packages/cli/src/deck/runtime.ts`, runs in the CLI process (the "backend"). Providers return raw data, runtime does the matching.

### D.3 Poll cadence

**Options considered:**
1. (Recommended) Poll every 1s, 200ms debounce
2. Event-driven D-Bus signals (Linux only, more complex)
3. Poll every 5s (saves CPU but sluggish)

**User choice:** Option 1 (poll every 1s, debounced 200ms).

**Rationale captured:** Cheap (one D-Bus call / sec), responsive enough for human task switching, works on all platforms uniformly.

---

## Notes

- All four areas discussed in 9 questions total (within the 4-per-area budget for standard mode).
- Standard mode confirmed via `workflow.discuss_mode: "discuss"` in `.planning/config.json`.
- No deep mode requested (no `--deep` flag in arguments).
- No scope creep — all decisions stay within R15/R16 + non-goal of "no pure-Wayland".
- One deferred idea: WS broadcast of provider state (session:locked, media:track-changed). Captured in `07-CONTEXT.md` `<deferred>` section; lands in Phase 09.

---
_Phase: 07-os-providers_
_Discussion captured: 2026-06-24_
