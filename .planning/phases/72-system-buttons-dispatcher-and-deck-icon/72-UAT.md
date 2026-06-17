---
status: complete
phase: 72-system-buttons-dispatcher-and-deck-icon
source:
  - 72-01-SUMMARY.md
  - 72-02-SUMMARY.md
started: 2026-06-17T18:30:00Z
updated: 2026-06-17T18:45:00Z
---

## Current Test
number: 1
name: Cold start smoke — server boots without errors
expected: |
  Starting the CLI from scratch (no Stream Deck device required) produces
  no errors. Configuration validates, addon registry loads, runtime
  constructs. If a device is plugged in, it renders; if not, the CLI
  should report a friendly "no device" message without crashing.
awaiting: user response

## Tests

### 1. Cold start smoke — server boots without errors
expected: |
  Kill any running sireno-deck process. Clear ephemeral state. Start
  the CLI. No crash on boot. Logs show addon registry loaded, config
  validated. If a Stream Deck device is present, the runtime renders;
  if not, the CLI reports "no device detected" and exits gracefully.
result: pending

### 2. BUG-04 — deck.icon survives schema round-trip
expected: |
  A deck YAML with `icon: "icon://app-window"` validates successfully
  and the field is preserved through `validateConfig` to the runtime's
  `runtimeDecks[deckKey]`. Without `icon`, the deck still validates
  (backwards compatible). Empty `icon: ""` is rejected.
result: pending

### 3. BUG-04 — OverlayToggleButton renders configured icon as the badge
expected: |
  When `activeOverlayDeck.icon` is set (e.g. `icon://app-window`), the
  badge shows the configured lucide icon. When `icon` is set and the
  deck name also starts with an emoji, the configured icon wins (the
  emoji is the deck name label, not the badge).
result: issue
reported: "No, i dont see the deck icon in the toggle button or in the n-1 system buttons (settings, back)"
severity: major

### 4. BUG-04 — OverlayToggleButton fallback chain (4 tiers)
expected: |
  Decks WITHOUT `icon` fall back through: first emoji of deck name →
  uppercase first char of deck name → `layout-grid` for empty
  deckName. Test 4a: name = "📺 Netflix" → badge shows "📺".
  Test 4b: name = "Plain Deck" → badge shows "P" (no emoji in name,
  so first char fallback). Test 4c: no name, no icon → layout-grid.
result: issue
reported: "same issue as before. the toggle button, renders an app icon static, not the deck logo or the deck name"
severity: major

### 5. BUG-03 — SplitActionSurface 2-line visual for pending overlay
expected: |
  When a base deck has a `pendingOverlayDeck` (overlay deck with
  `process_names` matching the active app + `autoShow: false`), the
  reserved back position at index 14 renders the 2-line
  SplitActionSurface with: primary = back icon + "Tap" chip, secondary
  = overlay deck icon (via the 4-tier chain) + "2xTap" chip.
result: issue
reported: "no visual changes, i see the regular buttons surface"
severity: major

### 6. BUG-03 — 2xTap summons the pending overlay
expected: |
  2xTap on the 2-line SplitActionSurface in the base deck calls
  `summonOverlay(pendingOverlayDeck.id)`. The active deck switches
  to the overlay. The reserved back position becomes the existing
  OVERLAY_TOGGLE_TYPE (dismiss on tap). The overlay's last button is
  always a back-to-base (no internal overlay history).
result: pass

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "When `activeOverlayDeck.icon` is set, the badge shows the configured lucide icon AND the n-1 system button (SplitActionSurface) shows the overlay deck's icon in the secondary slot"
  status: failed
  reason: "User reported: 'i dont see the deck icon in the toggle button or in the n-1 system buttons (settings, back)'"
  severity: major
  test: 3
- truth: "Decks without `icon` fall back to first-emoji of deck name → uppercase first char of deck name → `layout-grid` for empty deckName"
  status: failed
  reason: "User reported: 'same issue as before. the toggle button, renders an app icon static, not the deck logo or the deck name'"
  severity: major
  test: 4
- truth: "When a base deck has a `pendingOverlayDeck` (matching process_names + autoShow: false), the n-1 system button renders the 2-line SplitActionSurface"
  status: failed
  reason: "User reported: 'no visual changes, i see the regular buttons surface'"
  severity: major
  test: 5
