# Phase 49: Emoji-Selector UX Revamp — Discussion Log

**Gathered:** 2026-06-06
**Mode:** standard

This file is for human audit. Downstream agents reference `49-CONTEXT.md`, not this log.

---

## Areas Presented

1. HID output mechanism
2. Real emoji rendering
3. n-2 page nav model
4. Catalog source + subcategories
5. Subdeck back behavior

All 5 areas were selected for discussion.

---

## Area 1: HID output mechanism

**Options presented:**
- (a) Per-OS shim commands (xdotool/osascript/SendKeys) with config override (Recommended)
- (b) Use Stream Deck's text input via @elgato-stream-deck/node
- (c) Clipboard paste (xclip/pbcopy/clip + Ctrl+V)

**User choice:** Per-OS shim commands (Recommended).

**Rationale captured:** The Stream Deck library has no documented text-input API; the device does not support it. Clipboard paste requires the receiving app to support paste. Per-OS shim with config override is the only path that works in any app's text input without requiring app-side cooperation.

**Options not chosen:**
- (b) rejected: @elgato-stream-deck/node has no text-input API.
- (c) rejected: requires receiving app to support paste.

---

## Area 2: Real emoji rendering

**Options presented:**
- (a) Native emoji font stack (Recommended)
- (b) Twemoji PNG fallback
- (c) Keep + expand hand-curated SVG map

**User choice:** Native emoji font stack (Recommended).

**Rationale captured:** Twemoji PNG bloats the addon (~1-3MB). Expanding the hand-curated map is a non-answer to the feedback. Native font stack is the simplest, zero-asset, and matches the user's "real emoji" intent.

**Decision details:** The 12 branded SVG icons remain as deliberate visual overrides. New top step on the `Text` size ladder (`5xl` or new `giant` token) for the larger per-button glyph.

**Options not chosen:**
- (b) rejected: asset weight.
- (c) rejected: doesn't address the U+1Fxxx fallback.

---

## Area 3: n-2 page nav model

**Options presented:**
- (a) Reuse Phase 34 commands.tap + commands.double-tap on change-deck (Recommended)
- (b) New addon-local button type `emoji-page-nav`
- (c) Keep prev + next pair

**User choice:** Reuse commands.tap + commands.double-tap (Recommended).

**Rationale captured:** Smallest API surface, reuses an existing tested contract, and keeps pagination discoverable as the same `change-deck` pattern used elsewhere.

**Decision details:** Tap = `navigateToDeck(nextDeckId)`. Double-tap = `navigateToDeck(prevDeckId)`. Two `Chip` overlays show "Tap" (top-left) and "Dbl Tap" (bottom-right) on the button surface. Single-page category: no nav button. Position 12 is empty as visual breathing room.

**Options not chosen:**
- (b) rejected: creates a second page-nav pattern next to `change-deck`.
- (c) rejected: doesn't match user feedback ("use the n-2 button").

---

## Area 4: Catalog source + subcategories

**Options presented:**
- (a) Hand-curated JSON from piliapp reference (Recommended)
- (b) Vendor unicode-emoji-json
- (c) Build-time scrape of piliapp.com

**User choice:** Hand-curated JSON from piliapp reference (Recommended).

**Rationale captured:** Scrape is fragile and license-risky. `unicode-emoji-json` has coarser grouping than the piliapp reference. Hand-curated JSON gives full control over subcategory splits and keeps the asset footprint small.

**Decision details:** File at `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`. Schema: `[{ id, label, icon, emojis: [{ char, shortcode }] }]`. 8-12 subcategories pre-split (Smileys/People as separate entries, etc.).

**Options not chosen:**
- (b) rejected: grouping is too coarse for piliapp-style splits.
- (c) rejected: build-time web access is inappropriate for a CLI package.

---

## Area 5: Subdeck back behavior

**Options presented:**
- (a) First tap = main deck (Recommended)
- (b) Keep system back as-is
- (c) Hold-only home, tap = parent (current SRB-03b behavior)

**User choice:** "hold go to home and tap = parent, but use command helpers".

**Follow-up question presented:** "How should 'use command helpers' apply to the system-back button?"

**Options presented:**
- (a) Addon-decorated system back (Recommended) — new optional `system_back_tap_command` / `system_back_hold_command` deck config fields
- (b) Reuse existing restoreStack — "command helpers" was a reference to existing deckController methods
- (c) New emoji-back button type — addon-owned button replaces system back on emoji subdecks

**User choice:** Addon-decorated system back (Recommended).

**Rationale captured:** Keeps the core-owned system-reserved slot authoritative. The runtime stays the single owner of "what happens when the user presses the back slot on this deck" — addons supply the policy via config. This matches the existing pattern where validation rejects addon-claimed reserved slots (Phase 42) and the runtime owns the wiring (Phase 46).

**Decision details:** New optional `system_back_tap_command` and `system_back_hold_command` fields on the deck config. Runtime reads them on the active deck; if present, routes tap/hold through `runCommand` instead of `goBack` / `restoreStack([])`. Default behavior unchanged for decks without these fields.

**Options not chosen:**
- (a, original) rejected: doesn't match user intent.
- (b) rejected: reuses the runtime's hardcoded behavior, no addon-level customization.
- (c) rejected: would require a new reserved-slot suppression mechanism, more invasive.

---

## Areas Delegated to Agent's Discretion

- Exact font stack ordering (recommendation: Apple, Segoe, Noto, Twemoji Mozilla, system-ui, sans-serif).
- Whether the n-2 button uses an icon or just chips in its main area.
- The exact 8-12 subcategories in the curated JSON.
- Whether the new entry button shares the `emoji-entry-button` type name (and the existing per-emoji entry is renamed) or uses a fresh type name.
- Visual treatment of the 2×3 grid.
- Per-OS shim fallback chains (e.g. xdotool vs wl-copy on Linux).

## Deferred Ideas

- Multi-language emoji labels — future phase.
- Emoji search — future phase.
- Recent / frequently-used emoji history — future phase.
- Theme overrides for the new entry button's 2×3 grid — future phase.
- Per-emoji `commands.hold` action — future phase.
