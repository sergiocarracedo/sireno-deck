# Roadmap: Emoji-Selector Fixes + Paste Command

## Requirements Coverage Matrix

| Req ID | Description | Phase | Status |
|--------|-------------|-------|--------|
| REQ-001 | `paste://` writes to clipboard AND simulates paste keystroke | P1 | planned |
| REQ-002 | `paste://` unit tests verify both clipboard write + keystroke | P1 | planned |
| REQ-003 | Create `data/categories.json` with 10 categories from old repo | P2 | planned |
| REQ-004 | Update `support.ts` to load categories from JSON | P2 | planned |
| REQ-005 | Category icons use real emoji characters | P2 | planned |
| REQ-006 | Category-list deck uses core's `paginateDeck` | P2 | planned |
| REQ-007 | Favorites category always shown, defaults to 10 popular emojis | P3 | planned |
| REQ-008 | Launcher button renders "Emojis" text label | P3 | planned |
| REQ-009 | Emoji list decks render `core:page-nav` pagination buttons | P3 | planned |
| REQ-010 | Pagination nav buttons visually functional on emoji list decks | P3 | planned |
| REQ-011 | `lock:` config block defines a custom lock deck (buttons + folder nav) | P6 | planned |
| REQ-012 | When session state is `locked`, lock deck overrides the active deck | P6 | planned |
| REQ-013 | In locked mode: gestures disabled and system buttons not injected | P6 | planned |
| REQ-014 | Default lock deck shows current time across 3 buttons (HH : mm) | P6 | planned |
| REQ-015 | User-configured button that navigates to a folder exits locked mode (per-folder passthrough) | P6 | planned |
| REQ-016 | Buttons on a user-defined lock deck have actions disabled (no dispatch) | P6 | planned |

---

## Phase 1: paste:// Fix

**Goal:** `paste://` text is written to the clipboard AND pasted into the active application via keystroke simulation.

**Depends on:** None
**Blocks:** None
**Status:** planned

### Success Criteria

- [ ] `pasteText()` calls `clipboardProvider.writeText(text)` then `keyMacroProvider.sendKey("ctrl+v")`
- [ ] `keyMacroProvider` is optional — if unavailable, clipboard write still succeeds (graceful degradation)
- [ ] `dispatch("paste://🔥")` triggers both clipboard write and keystroke
- [ ] All existing tests pass unchanged
- [ ] New tests verify: (a) both providers called, (b) missing keyMacroProvider degrades gracefully, (c) emoji text round-trips correctly

### Tasks

- [ ] T1.1: Add `keyMacroProvider.sendKey("ctrl+v")` after `clipboardProvider.writeText()` in `pasteText()`, gated on `keyMacroProvider !== undefined` — `packages/cli/src/deck/methods.ts`
- [ ] T1.2: Add unit tests for paste+keystroke, graceful degradation, and emoji passthrough — `packages/cli/src/deck/__tests__/methods.test.ts`

### Must-Haves

- Sequential `await` — clipboard write completes before keystroke fires
- `ctrl+v` as the universal combo (platform providers handle mapping)
- No changes to clipboard or key-macro provider implementations

### Nice-to-Haves

- Error logging if `sendKey()` fails after successful clipboard write

## Phase 9: Post-v1 polish (hardware UX + emulator rework + system-status port)

**Goal:** Close remaining hardware UX gaps (splash on boot, black on shutdown, back-button-onhold in split mode), rework the emulator side panel into a navigable multi-page console (device / bridge logs / service logs / addons / config), and port the system-status addon from the legacy repo into the new addon architecture.

**Status:** [~] In progress
**Depends on:** Phase 8

### Workstreams
1. [x] Back-button onhold in split mode: render only when action exists; onhold navigates to main deck's overlay layer
2. [ ] Hardware splash on boot: send `packages/cli/src/assets/logoFull.png` to the real deck before Playwright initializes
3. [ ] Hardware shutdown: render black image so the deck doesn't show the last-rendered frame
4. [x] Emulator side panel → multi-page menu (device / bridge logs / service logs / addons / config)
5. [ ] Device-model swap: propagate changes through to the iframe
6. [x] System-status addon: port `packages/cli/src/builtin-addons/system-status` from legacy repo + surface helpers/

### Additional Features (committed)
- Config hot-reload (deck-only changes trigger fast reload, theme/addon changes trigger full Vite restart)
- Button error variant (`core:temporary-error`) with error rendering in Deck
- Config error handling improvements (`ButtonValidationResult`, schema issue logging)


---

## Phase 2: Categories Data Layer

**Goal:** Emoji-selector loads categories from a JSON file, uses real emoji icons, and integrates with core pagination.

**Depends on:** None
**Blocks:** P3
**Status:** planned

### Success Criteria

- [ ] `data/categories.json` exists with 10 categories, each having `{ char, shortcode }` emoji entries
- [ ] `support.ts` imports from JSON, exports typed `loadCategories()` function
- [ ] `EmojiCategorySpec` interface matches JSON structure
- [ ] Category icons render as real emoji characters (not `addon://` SVG URLs)
- [ ] Category-list deck sets `paginated: true` and delegates to `paginateDeck()`
- [ ] TypeScript compiles with `resolveJsonModule: true` in tsconfig

### Tasks

- [ ] T2.1: Create `data/categories.json` — 10 categories (smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags) with emoji data migrated from old repo — `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`
- [ ] T2.2: Update `support.ts` — import from JSON, define `loadCategories()`, update `EmojiCategorySpec` — `packages/cli/src/builtin-addons/emoji-selector/support.ts`
- [ ] T2.3: Verify `resolveJsonModule: true` in tsconfig, add if missing — `tsconfig.base.json`
- [ ] T2.4: Update category deck generation to use `loadCategories()` and set `paginated: true` — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`

### Must-Haves

- All 10 categories present with correct emoji data
- Named exports only, no default exports
- Zod validation with `.strict()` on any new schemas

### Nice-to-Haves

- Category ordering matches the canonical emoji standard order

---

## Phase 3: Favorites + Launcher + Pagination Polish

**Goal:** Favorites always visible, launcher shows proper label, pagination nav buttons render on emoji list decks.

**Depends on:** P2
**Blocks:** None
**Status:** planned

### Success Criteria

- [ ] Favorites category appears as first entry in category-list deck
- [ ] When `config.favorites` is empty, 10 default emojis are shown (❤️ 🔥 ⭐ 😂 👍 🎉 💯 ✨ 🙏 👑)
- [ ] Launcher button renders "Emojis" text label
- [ ] Selecting a category shows emoji list deck with working `core:page-nav` buttons
- [ ] Page-nav next/prev cycles through emoji pages correctly

### Tasks

- [ ] T3.1: Remove `hasFavorites` guard, always add favorites deck at position 0 with `DEFAULT_FAVORITES` fallback — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`
- [ ] T3.2: Fix launcher button to render "Emojis" text label — `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher/frontend.tsx` (and `config.ts` if default label is the issue)
- [ ] T3.3: Investigate and fix `core:page-nav` rendering on emoji list decks — check position conflicts, button registration, frontend rendering — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`, core pagination frontend
- [ ] T3.4: Manual verification — navigate full flow on Stream Deck hardware/simulator

### Must-Haves

- Favorites visible without user configuration
- Launcher shows readable text label
- Pagination nav buttons appear and function on emoji list decks

### Nice-to-Haves

- Favorites deck shows a "star" or heart icon on the category button

---

## Phase 4: Settings Deck

**Goal:** Add an internal settings deck with brightness controls and app info, accessible from the main system settings button.

**Depends on:** P3
**Blocks:** None
**Status:** [ ] Not started

### Success Criteria

- [ ] System settings button navigates to a new internal settings deck
- [ ] A reusable progress surface exists with icon, label, and progress bar (progress value is provided externally; show/hide-on-tap behavior is built in)
- [ ] Brightness darker button at position 0 decreases screen brightness and shows progress bar
- [ ] Brightness lighter button at position 1 increases screen brightness and shows progress bar
- [ ] App info button at position 2 shows the app logo and version
- [ ] Emulator stores a brightness value and exposes it via state; real device uses wsBridge messages to change hardware brightness

### Tasks

- [ ] T4.1: Extract a reusable progress surface component (`IconLabelProgressSurface`) that accepts icon, label, progress value, and visibility; shows progress on tap and hides after a timeout — `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`
- [ ] T4.2: Create internal settings deck factory with darker/lighter/app-info buttons — `packages/cli/src/builtin-addons/internal-settings/decks/index.ts` (or core deck system)
- [ ] T4.3: Wire the system settings button in the main deck to navigate to the settings deck — `packages/cli/src/builtin-addons/core` deck generation
- [ ] T4.4: Add brightness state mutation and wsBridge command in `OutputClient` (emulator stores value, real device sends hardware brightness command) — `packages/cli/src/outputClient/emulator.ts` and `packages/cli/src/outputClient/real.ts`
- [ ] T4.5: Add tests for the progress surface and settings deck wiring

### Must-Haves

- Progress surface is a reusable UI component themes can override
- Brightness controls work in both emulator and real mode
- Settings deck is reachable from the main deck settings button

### Nice-to-Haves

- Progress bar auto-dismisses with a smooth transition

---

## Phase 5: Overlay Decks

**Goal:** Decks can declare a `trigger` (process name + optional window-name regex) and surface as an overlay layer when the active window matches, with a toggle button to switch between regular and overlay layers, each with independent navigation history.

**Depends on:** P4
**Blocks:** None
**Status:** [x] Complete (2026-07-17)

### Success Criteria

- [x] Deck `trigger` matches on process name **and** optional window-name regex (case-insensitive) — implemented with globs (per CONTEXT decision)
- [x] When trigger matches, overlay deck is available; `autoShow: true` switches to it automatically
- [x] When trigger stops matching, overlay is dismissed
- [x] Regular decks inject an `n-1` system button rendered via `SplitSurface` showing the conventional action (settings at home, back elsewhere) as primary and `core:overlay-toggle` (deck icon + dbltap affordance) as secondary
- [x] `core:overlay-toggle` dbltap switches from regular deck layer to overlay deck layer
- [x] Overlay decks have an independent navigation history (separate back stack from regular decks)
- [x] Overlay deck's `n-1` button shows only the toggle deck layer (back + overlay-toggle) — no settings button
- [x] Overlay deck's back button navigates within the overlay's own history
- [x] Overlay deck's back button **onhold** navigates to the regular deck layer's main deck
- [x] `core:overlay-toggle` surface renders the deck's icon with a dbltap hint

### Tasks

- [x] T5.1: Extend `TriggerSchema` to accept window-name pattern with regex/case-insensitive matching — `packages/cli/src/config/schemas.ts`, `packages/cli/src/system/glob-match.ts`
- [x] T5.2: Wire `autoShow` semantics — when true and trigger matches, set overlay automatically without user toggle — `packages/cli/src/deck/runtime.ts`
- [x] T5.3: Implement per-deck navigation history stack (overlay decks have an isolated stack separate from the regular layer) — `packages/cli/src/deck/runtime.ts`
- [x] T5.4: Update system back injection to use `SplitSurface` for the `n-1` button when overlay is available, with conventional action primary + `core:overlay-toggle` secondary — `packages/cli/src/deck/system-back-injection.ts`
- [x] T5.5: Implement `core:overlay-toggle` button surface (deck icon + dbltap affordance) and wire dbltap to switch layers — `packages/frontend/...` (overlay-toggle surface)
- [x] T5.6: Implement overlay-deck back-button onhold gesture to jump to the regular layer's main deck — `packages/cli/src/deck/runtime.ts`, `packages/frontend/...`
- [x] T5.7: Add tests: trigger regex matching, autoShow behaviour, independent history, SplitSurface n-1 injection, onhold back-to-main, overlayToggle dbltap layer switch — `packages/cli/src/deck/__tests__/`

### Must-Haves

- Window-name matching uses a real regex (not glob), with `i` flag support
- Overlay deck layer is fully isolated: history, back-button behaviour, n-1 injection
- `core:overlay-toggle` is a first-class system surface (typed, themed, overridable)
- No regression on non-overlay deck flows

### Nice-to-Haves

- Visual flash/animation when overlay layer activates/deactivates
- Per-overlay-deck custom toggle icon (fall back to deck icon if absent)

---

## Phase 6: Lock Deck

**Goal:** When the OS session is locked, the deck switches to a global lock-deck mode: the lock deck (user-defined or 3-button time fallback) overrides any other deck, gestures are disabled, and system buttons are not injected — except when the user navigates to a configured folder, which exits the locked mode for that flow.

**Depends on:** P5
**Blocks:** None
**Status:** [x] Complete (2026-07-17)

### Success Criteria

- [ ] Config schema accepts a `lock:` block at the root with `buttons:` (and optional `folder:`, `trigger:`)
- [ ] When session provider state is `locked`, the lock deck replaces the active deck as a global overlay (overrides overlay-toggle behaviour, takes precedence over window-triggered overlays)
- [ ] In locked mode: gesture handlers on all buttons are no-ops; no `n-1` / settings / overlay-toggle system buttons are injected
- [ ] Default lock deck renders the current time on 3 buttons: HH (hours), `:` separator, MM (minutes) — refreshed each minute (reuses `core:locked-time-tile` from `date-time` addon)
- [ ] A user-defined lock deck from `lock.buttons` is used in place of the default when present; the buttons render as configured but their action dispatch is suppressed
- [ ] When a button on the user-defined lock deck has a `go-to-folder` action that navigates to a folder, the navigation proceeds and the runtime exits locked mode for that folder flow (system buttons re-injected, gestures re-enabled)
- [ ] Unlock reverts to the previous active deck and previous navigation stack (or main deck if none)
- [ ] All existing non-lock tests pass unchanged; new tests cover the schema, mode transition, gesture suppression, system-button hiding, folder passthrough, and time-tile rendering

### Tasks

- [ ] T6.1: Extend config schema with `lock:` block (`zod` `.strict()`); accepts `buttons: ButtonSpec[]` and optional `folder: string` — `packages/cli/src/config/schemas.ts`
- [ ] T6.2: Add `LockMode` to runtime — introduce `lockDeckId`, `lockActive: boolean`, `preLockActiveDeckId`; subscribe to session provider state and toggle lock when state transitions — `packages/cli/src/deck/runtime.ts`
- [ ] T6.3: Make lock mode global — when `lockActive`, `getActiveDeck()` returns the lock deck; takes precedence over overlay layer — `packages/cli/src/deck/runtime.ts`
- [ ] T6.4: Disable gestures in locked mode — `dispatch()` / gesture handlers become no-ops for buttons on the lock deck; allow `go-to-folder` to escape (sets `lockActive = false`, navigates, re-injects system buttons) — `packages/cli/src/deck/methods.ts` or `runtime.ts`
- [ ] T6.5: Suppress system-button injection in locked mode — skip `core:back` / `core:settings-entry` / `core:overlay-toggle` n-1 injection when lock active — `packages/cli/src/deck/system-back-injection.ts`
- [ ] T6.6: Define default lock deck factory (3 time buttons + colon: HH | : | MM) — `packages/cli/src/builtin-addons/session/decks/locked.ts` (replace existing 5-button default) or new `packages/cli/src/builtin-addons/session/decks/locked-default.ts`
- [ ] T6.7: Wire `lock.buttons` (user-defined) — at startup, build a deck from config buttons; suppress actions on dispatch; allow `go-to-folder` to escape lock — `packages/cli/src/deck/deck-config.ts`
- [ ] T6.8: Tests — schema validation, mode toggle on session state change, gesture suppression, system-button hiding, time-tile render, folder passthrough, unlock reverts state — `packages/cli/src/deck/__tests__/`, `packages/cli/src/config/__tests__/`

### Must-Haves

- `lock:` is a first-class config surface (typed, validated, `.strict()`); defaults exist so empty config still works (3-button time fallback)
- Lock mode takes precedence over both regular and overlay deck layers
- The `go-to-folder` escape hatch is the only way a user-defined lock deck can produce non-trivial behaviour
- Unlock restores the previous active deck and stack — not the main deck (unless that was previous)
- No regression on non-locked flows (regular navigation, overlay decks, gestures, system buttons)

### Nice-to-Haves

- Show a small "🔒" indicator on the lock deck surface
- Customizable lock deck icon / label in the user-defined `lock:` block
- Smooth transition animation when entering/exiting locked mode

---

## Verification Points

| Phase | What to verify | How |
|-------|---------------|-----|
| P1 | pasteText() calls both providers | Unit test: mock both providers, assert `sendKey("ctrl+v")` called after `writeText()` |
| P1 | Graceful degradation without keyMacroProvider | Unit test: omit keyMacroProvider, assert `writeText()` still called, no throw |
| P1 | Emoji round-trip through paste | Unit test: `dispatch("paste://🔥")` calls `writeText("🔥")` |
| P2 | JSON loads correctly | `loadCategories()` returns 10 categories with emoji arrays |
| P2 | TypeScript compiles | `tsc --noEmit` passes with JSON import |
| P2 | Category icons are real emoji | Visual check: category buttons show emoji, not broken images |
| P2 | Pagination wired | Category deck has `paginated: true`, `paginateDeck()` called during generation |
| P3 | Favorites always shown | Category list starts with favorites even when config has empty array |
| P3 | Launcher label | Launcher button shows "Emojis" text |
| P3 | Page-nav visible | Emoji list decks show page-nav button at position 13 |
| P3 | End-to-end paste | Tap emoji → clipboard has emoji + emoji appears in target app |
| P4 | Settings deck opens | System settings button navigates to internal settings deck |
| P4 | Brightness controls | Tap brighter/darker changes screen brightness value and shows progress bar |
| P4 | App info button | Button shows app logo and version string |
| P5 | Trigger matches by process + window regex | Unit test: matcher returns true for matching process + matching window-name regex, false otherwise |
| P5 | autoShow switches overlay automatically | Unit test: when autoShow=true and trigger matches, overlay activates without manual toggle |
| P5 | Independent overlay history | Unit test: navigating inside overlay deck does not push onto regular layer history; back from overlay root dismisses overlay |
| P5 | SplitSurface n-1 with overlay available | Build-config test: n-1 button is `core:split` with primary=settings/back + secondary=core:overlay-toggle |
| P5 | OverlayToggle dbltap switches layer | Runtime test: dbltap on `core:overlay-toggle` while in regular layer activates overlay deck |
| P5 | Back-button onhold jumps to main deck | Gesture test: long-press on overlay back button from overlay root dismisses overlay and shows regular layer's main deck |
| P6 | Lock config parses | Unit test: `lock: { buttons: [...] }` and `lock: { folder: "..." }` both validate with `.strict()` |
| P6 | Lock mode activates on session state change | Runtime test: feed `state: "locked"` into runtime, assert `getActiveDeck()` returns lock deck and `lockActive === true` |
| P6 | Lock mode takes precedence over overlay | Runtime test: while overlay deck is active, session goes to `locked`, lock deck wins |
| P6 | Gestures suppressed in lock mode | Runtime test: tap a lock-deck button, assert no dispatch / no state mutation |
| P6 | System buttons not injected in lock mode | Build-config test: `injectSystemButtons(deck)` produces no n-1 / settings / overlay-toggle when lock active |
| P6 | Default time deck renders HH : MM | Snapshot test: `formatLockedTimeTileCharacter` for the 3 slots yields HH / `:` / MM |
| P6 | User-defined lock deck renders from config | Build-config test: `lock.buttons` produces the expected deck layout |
| P6 | User button actions suppressed | Runtime test: tap user-defined lock button with `dispatch: "paste://…"`, assert no dispatch fired |
| P6 | Folder navigation exits lock mode | Runtime test: tap `go-to-folder` on user lock deck, assert `lockActive === false` and folder deck is active with system buttons |
| P6 | Unlock restores previous active deck | Runtime test: session goes `unlocked`, assert previous active deck is restored and `lockActive === false` |

## Dependencies Graph

```
P1 (paste:// fix)          P2 (categories.json)
    independent                independent
        │                          │
        │                          ▼
        │                    P3 (favorites + polish)
        │                          │
        └──────────────────────────┘
                 P1 and P2 are
                 independent of
                 each other; both
                 feed into P3
                                │
                                ▼
                          P4 (settings deck)
                                │
                                ▼
                          P5 (overlay decks)
                                │
                                ▼
                          P6 (lock deck)
```

P1 and P2 have **zero dependency** on each other — they can be worked in parallel or either first. P3 depends on P2 (favorites and pagination use the new data layer) but not on P1. P4-P6 form a linear chain: P4 (settings) → P5 (overlay) → P6 (lock — needs overlay precedence mechanics).

---

## Phase 7: Text Line-Clamp & Ellipsis

**Goal:** Allow Text component to define line-clamp with ellipsis for long text, with optional space reservation even when empty.

**Depends on:** None
**Blocks:** None
**Status:** [x] Complete

### Success Criteria

- [x] Text component accepts `fit` prop that can be either a string (`"ellipsis"`) or an object (`{ type: "line-clamp", lines: 2, reserveSpace: true }`)
- [x] When `fit` is set to `"ellipsis"`, it's treated as alias for `{ type: "ellipsis" }`
- [x] Line-clamp truncates text after specified number of lines with "..." appended
- [x] `reserveSpace: true` forces the component to use the line count even when content is empty
- [x] All existing Text component tests pass unchanged

### Tasks

- [x] T7.1: Define `FitConfig` type (string | object union) and update Text component props — `packages/cli/src/ui/primitives/text.tsx`
- [x] T7.2: Implement line-clamp logic with ellipsis truncation — `packages/cli/src/ui/primitives/text.tsx`
- [x] T7.3: Add tests for fit prop variations, line-clamp behavior, and reserveSpace — `packages/cli/src/ui/__tests__/text.test.tsx`

### Must-Haves

- `fit` prop accepts both string and object forms
- Line-clamp truncates at specified line count with "..."
- `reserveSpace` respects empty content
- No regression on existing Text component usage

### Nice-to-Haves

- Configurable ellipsis character (default "...")

## Phase 10: Deck Reliability, Application Overlays, Config Includes, and Hardware Lifecycle

**Goal:** The main deck renders image assets immediately, Chrome/VS Code/OpenCode overlays activate reliably, config files support nested path-relative includes, and real hardware shows a startup splash then clears to black on exit.
**Status:** [x] Complete (2026-07-21)
**Depends on:** Phase 9

### Plans
- [x] 10-01: Real-hardware startup splash + black shutdown
- [x] 10-02: Wayland+GNOME window title via D-Bus
- [x] 10-03: Chrome overlay addon
- [x] 10-04: Frontend asset timing reliability
- [x] 10-05: Nested YAML config includes

## Phase 11: Addon Manifest v2 + Per-Addon Deck Overrides

**Goal:** Simplify addon manifest authoring by replacing the `<addon>:<deck>` keyed object with a `decks` array that supports static, single-dynamic, and multi-dynamic entries; let users pass `config` to addons in `config.yml` and override individual addon-deck fields (autoShow, name, icon, trigger, extra config keys).
**Depends on:** Phase 10 (chrome-overlay/vscode-overlay/opencode-overlay addons exist; get migrated here)
**Status:** [ ] Not started

### Scope

1. **Manifest `decks` → array** (`packages/cli/src/addon/api.ts`):
   - Static: `{ id: "<addon>:<deck>", name, icon, paginated?, autoShow?, isOverlay?, trigger?, buttons }`
   - Single-dynamic: `{ id: "<addon>:<deck>", createDeck: (cfg) => deckObject }`
   - Multi-dynamic: `{ createDecks: (cfg) => Record<<addon>:<deck>, deckObject> }`
   - Drop the `type` field (no longer needed for lookup; the `id` is the canonical key)
   - Hard cutover: reject the old `Record<<addon>:<deck>, {type, createDecks}>` shape at manifest load

2. **AddonRegistry rewrite** (`packages/cli/src/addon/registry.ts`):
   - Walk the `decks` array; for each entry, register a deck-type keyed by the entry `id` (or each generated id from `createDecks`)
   - Reject ids that don't match `manifest.name` as prefix (clear error pointing at the addon)

3. **Config-side `addons[i].config`** (`packages/cli/src/config/schemas.ts`):
   - Extend `AddonEntrySchema` object form: `{ source, enabled?, config?: { decks?: Record<<deckId>, { autoShow?, name?, icon?, trigger?, config? }> } }`
   - Replaces the top-level `overlay:` key — `overlay:` removed in this phase (quick-006 work reverts)

4. **Runtime merge order** (`packages/cli/src/cli/commands/addon-decks.ts`):
   - For each addon, `createDeck(s)({config: { ...defaultButtonConfig, ...addonEntry.config ?? {} }, deck, keyCount})`
   - After `createDeck(s)` returns, apply per-deck overrides from `addonEntry.config.decks` keyed by deck id

5. **Migrate 3 addons** (Phase 10):
   - `chrome-overlay/index.js` — `decks: { "chrome-overlay:shortcuts": { ... } }` → `decks: [{ id: "chrome-overlay:shortcuts", ...static fields, buttons }]`
   - Same for vscode-overlay, opencode-overlay

6. **Revert quick-006** (`packages/cli/src/config/schemas.ts`, `run.ts`):
   - Remove `OverlayConfigSchema`, `AddonOverlayOverrideSchema`, `materializeAddonDecks` `addonOverrides` parameter, `materializeDeckFromConfig` helper, `effectiveDecks` overlay-first ordering
   - Remove 5 schema tests + 3 addon-override tests from quick-006

### Success Criteria

- [x] All 3 Phase-10 addons load via the new array format and their decks render on trigger match
- [x] User can put `{autoShow: false}` in `addons[i].config.decks.<deckId>` and it overrides the addon's default
- [x] User can put extra keys in `addons[i].config.decks.<deckId>.config` and they reach `createDeck(s)({config})`
- [x] `addons[i].config` (top-level, not under `decks`) merges into addonConfig and reaches `createDeck(s)`
- [x] Old `{type, createDecks}` manifest shape is rejected with a clear error
- [x] Top-level `overlay:` key is gone (no migration shim — user config moves to `addons[i].config.decks`)
- [x] All existing tests pass; new tests cover: array shape parsing, per-deck override apply, addonName-prefix validation, config-merge order

### Out of Scope

- Deck grouping / multi-deck overlays per addon
- Remote addons (npm install / URL)
- Schema versioning on the manifest (`apiVersion` is still 1; bump deferred)
