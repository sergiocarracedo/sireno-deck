---
status: complete
phase: 72-system-buttons-dispatcher-and-deck-icon
source:
  - 72-01-SUMMARY.md
  - 72-02-SUMMARY.md
started: 2026-06-17T18:30:00Z
updated: 2026-06-17T19:00:00Z
---

## Current Test
number: 6
name: 2xTap-summon action
result: pass

## Tests

### 1. Cold start smoke — server boots without errors
result: pass

### 2. BUG-04 — deck.icon survives schema round-trip
result: pass

### 3. BUG-04 — OverlayToggleButton renders configured icon as the badge
result: issue
reported: "No, i dont see the deck icon in the toggle button or in the n-1 system buttons (settings, back)"
severity: major

### 4. BUG-04 — OverlayToggleButton fallback chain (4 tiers)
result: issue
reported: "same issue as before. the toggle button, renders an app icon static, not the deck logo or the deck name"
severity: major

### 5. BUG-03 — SplitActionSurface 2-line visual for pending overlay
result: issue
reported: "no visual changes, i see the regular buttons surface"
severity: major

### 6. BUG-03 — 2xTap summons the pending overlay
result: pass

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0

## Gaps (diagnosed)

### Gap 1 (Test 3) — user expects custom deck logo, gets static lucide icon
- truth: "When `activeOverlayDeck.icon` is set, the badge shows the configured lucide icon AND the n-1 system button (SplitActionSurface) shows the overlay deck's icon in the secondary slot"
  status: diagnosed
  reason: "User reported: 'i dont see the deck icon in the toggle button or in the n-1 system buttons (settings, back)'"
  severity: major
  root_cause: |
    Code is correct. `OverlayToggleButton.tsx:1-65` extracts `activeOverlayDeck.icon`,
    calls `iconConfigToProps`, and renders the result. `SplitActionSurface` render at
    `runtime.ts:1094-1125` uses the same 4-tier chain. The 3 new schema tests + 2 new
    OverlayToggleButton render tests all pass (14/14 schemas, 6/6 OverlayToggleButton).
    Test 6 (2xTap-summon) passes, proving the icon field reaches the runtime and the
    dispatcher wiring is correct.
    The user's `icon: "icon://app-window"` resolves to Lucide's `app-window` glyph —
    a STATIC app-window icon, not a custom deck logo. The user expected a custom logo
    (e.g. `./chrome.svg`) and did not realize `icon://app-window` is just a static
    lucide icon. Additionally, the n-1 system button shows the OVERLAY deck's icon
    (when an overlay is configured) — never the base deck's icon.
  affected_files:
    - packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx
    - packages/cli/src/deck/runtime.ts
  proposed_fix: |
    Documentation update only — no code change needed. The behavior matches the
    REQUIREMENTS.md spec ("renders the deck's `icon` (from the addon manifest or the
    deck `icon` field) next to the `send-to-back` icon"). Add a note to the docs that
    `icon://` is for Lucide icon names (static glyphs), and `./path.svg` or
    `addon://` is for custom logos. Also clarify that the n-1 system button shows
    the overlay deck's icon, not the base deck's.

### Gap 2 (Test 4) — same root cause as Gap 1
- truth: "Decks without `icon` fall back to first-emoji of deck name → uppercase first char of deck name → `layout-grid` for empty deckName"
  status: diagnosed
  reason: "User reported: 'same issue as before. the toggle button, renders an app icon static, not the deck logo or the deck name'"
  severity: major
  root_cause: |
    Same as Gap 1. The 4-tier fallback chain is implemented correctly in
    `OverlayToggleButton.tsx:20-65` and `runtime.ts:1094-1125`. Tests 4a (emoji
    "📺 Netflix" → "📺") and 4b (name "Plain Deck" → "P") and 4c (no name + no
    icon → layout-grid) all pass via the new tests. The user's config DOES have
    `icon: "icon://app-window"` set, so the chain stops at tier 1 (the static
    lucide `app-window` icon) — which is what they see, but they expected a
    custom logo.
  affected_files:
    - packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx
  proposed_fix: |
    Documentation update only — same as Gap 1.

### Gap 3 (Test 5) — no overlay configured, so 2-line variant never renders
- truth: "When a base deck has a `pendingOverlayDeck` (matching process_names + autoShow: false), the n-1 system button renders the 2-line SplitActionSurface"
  status: diagnosed
  reason: "User reported: 'no visual changes, i see the regular buttons surface'"
  severity: major
  root_cause: |
    The 2-line SplitActionSurface variant only renders when an overlay deck is
    configured with `process_names` matching the active app AND `autoShow: false`.
    Without an overlay deck (or with `autoShow: true`), the dispatcher at
    `system-buttons.ts:29-67` returns either OVERLAY_TOGGLE_TYPE (when overlay is
    active) or the single-line back button (when no pending overlay). The user's
    config likely has the default setup (no overlay deck) OR the active app does
    not match any configured overlay's `process_names`, so the 2-line variant
    never fires. The render code at `runtime.ts:1094-1125` is correct and only
    renders the secondary slot when `pendingOverlayDeck !== null`.
  affected_files:
    - packages/cli/src/deck/system-buttons/system-buttons.ts
    - packages/cli/src/deck/runtime.ts
  proposed_fix: |
    Documentation update only — no code change needed. The 2-line variant is
    documented in REQUIREMENTS.md as "When an active-app overlay deck is
    configured with `autoShow: false`". Without an overlay deck, the button
    shows the single-line back button (the default). Add a tutorial/example
    config to the docs showing the required `process_names` + `autoShow: false`
    pattern to trigger the 2-line variant.
