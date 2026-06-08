# Phase 55: Active-app overlay decks - Context

**Gathered:** 2026-06-08
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Let addons declare decks that should appear when a specific process is the active foreground app. These "active-app decks" are shown overlaid on top of the current base deck — they do not pollute the base deck's history stack, and the user can dismiss them via a toggle button on the overlay or a double-tap of the back button on the base deck.

This phase delivers: (1) a new `process_names` field on `AddonGeneratedDeck`, (2) an OS-independent active-app monitor that polls the foreground process at 500ms, (3) an overlay deck presentation model in the runtime, (4) the dismiss gestures (toggle button on overlay + double-tap back on base), and (5) a graceful "not supported" path for pure Wayland sessions.

</domain>

<decisions>
## Implementation Decisions

### Active-app deck state model

- **Auto-dismiss on process change** — when the active process changes to a different declared process, the current overlay is dismissed and the new one is shown. When the active process changes to a non-declared process, the overlay is also dismissed and the base deck is restored.
- **One overlay at a time** — the runtime maintains a single "active overlay" slot. A new match replaces the old overlay.
- **No overlay stacking** — the overlay is a state, not a stack; the dismiss button is the only way out.
- The overlay deck uses its own local page history (multi-page overlays work via the existing n-2 / reserved-slot conventions).

### Base deck stack preservation

- "Exiting the overlay leaves the base deck's stack exactly as it was" — the overlay sits ABOVE the base stack and never modifies it.
- The overlay's reserved-slot button is ALWAYS the "dismiss overlay" toggle (icon + "Base" label), on every page of the overlay.
- The base deck's reserved-slot is unaffected — it's the standard chevron+Back on base decks and the settings affordance on the main deck.

### Double-tap detection

- **350ms window** for the double-tap dismiss gesture.
- **Any back action counts** — the system-back on the reserved slot, the n-2 page-back buttons on user-deck pagination, and any user-defined "go back" action. The first tap goes back in the base stack normally; the second tap within 350ms dismisses the overlay (and skips the base-stack pop for the second tap, so the user's intent is honored).
- A "first tap queues a 200ms hint flash" is **out of scope** — the second tap must be quick, but no visual feedback is required for the first tap.

### Wayland fallback

- On pure Wayland (no XWayland), the runtime logs a clear "not supported" warning at startup and disables active-app decks. **No warning deck** — just a log line, matching how the system-status addon surfaces unsupported platforms.
- The `Esc`/`q` keyboard escape continues to work to exit the daemon even while an overlay is active.

### Process matching

- **Case-insensitive substring** match. `code` matches `code`, `Code`, `code-insiders`, `Code.exe`, `code.app`.
- **OS-specific executable suffix** is auto-appended: `.app` on macOS, `.exe` on Windows. So `code` on macOS matches `Code.app`; on Windows it matches `code.exe`. The user only writes `code`.
- **First-match-wins by addon load order** — the addon loaded first (built-ins first, then user addons in `config.yml` order) wins. A startup log warning is emitted when duplicates are detected: `process 'X' is declared by both 'addon-A' and 'addon-B'; using addon-A`.
- **Longest substring does NOT win** — strict load-order priority. If the user wants `code-insiders` to beat `code`, they order their addons accordingly.

### `active-win` dep policy

- **No `optionalDependencies`** — `active-win` is a real `dependency`. But it must be **OS-abstracted** like the system-status addon, so the platform-conditional code is in `system/active-app/`, not in a single `active-win`-bound file.
- Mirror the system-status pattern: `system/active-app/` directory with a `linux.ts` (uses `active-win`), `darwin.ts` (uses `osascript` or native APIs), `windows.ts` (uses PowerShell `Get-Process` or `node-window-manager`). A `getActiveAppProvider()` factory selects the right one at runtime.
- If the platform provider is missing or fails to load, the runtime logs a startup warning and disables active-app decks — same as Wayland.

### Settings deck under overlay

- The overlay has **no settings button** on its reserved slot — that slot is the dismiss toggle.
- The base deck's settings affordance is unaffected: tapping it pushes the settings deck on top of the base stack. If an overlay is active, the settings deck sits on top of the overlay (overlay is still showing the deck behind it; the user sees settings, with the system-back on settings going to the overlay, and another back going to the base).
- **Hold-back from settings returns to the overlay** — the user said: "the back button in this case, on hold backs to the overlay". So when in the settings deck, a long-press on back skips the normal pop and goes to the overlay (if one is active). Single tap still pops one level at a time.

### `process_names` schema

- The field is optional on `AddonGeneratedDeck`. Absence means the deck is not an active-app deck — it's a regular addon-generated deck.
- `process_names: string[]` — array of substrings. Match any of them.
- The schema is backwards-compatible (`SIRENO_ADDON_API_VERSION` stays at 1).

### Agent's Discretion

- Exact icon for the dismiss toggle button (chevron-down? home? minimize?) — pick whatever's idiomatic to the existing icon set.
- Exact wording of the dismiss toggle label ("Base" suggested by success criteria, but anything unambiguous is fine).
- The 500ms poll cadence is a default; whether to expose it as config is agent's discretion.
- The exact log line format for the "not supported" warning.

</decisions>

<specifics>
## Specific Ideas

- The dismiss toggle on the overlay is the "minimize to base deck" affordance — same conceptual model as window minimize (overlay is "on top" of the base; the toggle is "put it back underneath").
- The 350ms double-tap window is hardcoded, not configurable. If we need to tune it, we can expose it later; for v1.5, keep it simple.
- The `active-win` Linux provider can use a small wrapper so that test code can inject a mock. The other platform providers can also be tested by injecting a mock provider.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — phase 55 goal, requirements ACTIVEAPP-01..06, success criteria
- `.planning/STATE.md` — milestone context (v1.5, 5/7 phases complete)
- `packages/cli/src/addon/api.ts:36` — current `AddonGeneratedDeck` interface (needs `process_names` added)
- `packages/cli/src/builtin-addons/system-status/` — the OS-abstraction pattern to mirror (linux/darwin/windows providers under a `getProvider()` factory)
- `packages/cli/src/system/host-context.ts` — the existing static `hostContext: { os, session }` module; the new active-app monitor is the polled counterpart
- `packages/cli/src/system/session-monitor.ts` — the existing `SessionMonitor` class with `getSnapshot()` + `subscribe()` + `emit()` — same shape is desirable for the `ActiveAppMonitor`
- `packages/cli/src/deck/runtime.ts` — `runtimeDecks` injection (where the overlay state would sit), `getDeckButtons` (where overlay reserved-slot override would go), `system-back-button.tsx` (the component that needs to know when it's in overlay mode), `system-back-injection.ts` (the `shouldInjectSystemBack` gate that already handles `locked_deck`; overlay is a parallel case)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`SystemBackButton` component** (`packages/cli/src/deck/system-back-button.tsx`) — currently has `isMainDeck` + `onNavigateToSettings` props. Needs a new `isOverlay` mode where it renders the "Base" dismiss toggle.
- **`shouldInjectSystemBack` gate** (`packages/cli/src/deck/system-back-injection.ts:10`) — already accepts a `HostSessionState` and a `config.session.locked_deck`; the overlay concept is a parallel gate ("don't inject the standard back if this is an overlay deck, inject the dismiss toggle instead").
- **`SessionMonitor` class** (`packages/cli/src/system/session-monitor.ts`) — exact shape (`getSnapshot`, `subscribe`, `emit`) to copy for `ActiveAppMonitor`. Tests can use `createSessionMonitorDouble` as a template.
- **System-status OS providers** (`packages/cli/src/builtin-addons/system-status/`) — directory structure + factory pattern to mirror in `system/active-app/`.
- **`AddonGeneratedDeck` interface** (`packages/cli/src/addon/api.ts:36`) — needs `process_names?: string[]` added. The renderer / loader reads this field; absence means regular deck.
- **`addon/builtin.ts`** — registers the bundled addons. The system-status pattern is the model for what we DON'T need (active-app is core, not an addon).

### Established Patterns

- **OS-conditional code lives in `builtin-addons/system-status/` with per-platform files and a factory function** selected at runtime. Phase 55 mirrors this with `system/active-app/`.
- **Addon manifest versioning**: `SIRENO_ADDON_API_VERSION` is 1; manifest extensions are additive and backwards-compatible.
- **Reserved-slot behavior** is decided by `shouldInjectSystemBack` (a single function returning bool). Adding a new gate ("is this an overlay deck?") is parallel — same return-bool signature.
- **The runtime's `runtimeDecks` is the canonical deck map** — overlay state could live as a separate `overlayDeckId?: string` field on the runtime's state, with the runtime consulting it during render.
- **Double-tap gestures** are already in the runtime for the system-back hold command (line 949-959 of `runtime.ts`). The 350ms window is a new constant, but the wiring is similar.

### Integration Points

- The new `system/active-app/` module needs to be loaded by the runtime (started in `createDeckRuntime`, stopped in `runtime.stop`).
- The `AddonGeneratedDeck` interface change ripples to `core/schemas.ts` (validation) and `addon/api.ts` (TypeScript type).
- The `runtimeDecks` map needs an overlay layer above it (or a parallel `overlayState` field consulted during render).
- The `system-back-button.tsx` component needs a new branch for `isOverlay === true` → render the "Base" toggle.
- The `system-back-injection.ts` gate needs an overlay check, parallel to the locked-deck check.

</code_context>

<deferred>
## Deferred Ideas

None — the discussion stayed within phase scope. All gray areas were resolved.

</deferred>

---
*Phase: 55-active-app-overlay-decks*
*Context gathered: 2026-06-08*
