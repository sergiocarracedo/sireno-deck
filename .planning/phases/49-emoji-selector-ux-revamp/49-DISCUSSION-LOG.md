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

---

## Post-Ship Amendment Discussion (2026-06-06)

After phase 49 verification, three amendments were captured in a follow-up discussion. The user reported issues against the shipped code and asked for specific corrections.

### Amendment A1: clipboardy for the pasteText path (supersedes Area 1)

**Context:** User reported the emojis are not being delivered. The shipped `entry.tsx` uses `methods.pasteText(config.emoji)` for the default tap path and `methods.pasteText(shortcode)` for the default double-tap path, backed by the per-OS clipboard impl in `packages/cli/src/util/clipboard.ts` (xclip / pbcopy / PowerShell + xdotool / osascript / SendKeys). The clipboard-write step is silently failing in the user's environment.

**Options presented (interpretation):**
- (a) Replace HID shim section entirely (Recommended) — build the per-OS HID shim that was decided in Area 1 but never actually wired (no per-OS shim module exists in the repo)
- (b) Fix broken pasteText path — keep the clipboard-paste model, just fix the silent-failure issue

**User choice:** Fix broken pasteText path (option b).

**Follow-up options for the fix:**
- (a) Mixed: Linux `xdotool type` direct, macOS `osascript keystroke` direct, Windows clipboard+SendKeys (Recommended)
- (b) All direct keystroke
- (c) All clipboard+paste
- (d) Use `clipboardy` npm package (https://www.npmjs.com/package/clipboardy) for the clipboard write step

**User choice:** Use `clipboardy` (option d).

**Rationale captured:** The user does not want a new HID shim path; they want the existing clipboard-paste path to be reliable. `clipboardy` is a well-known cross-platform clipboard library that surfaces clear errors when the underlying tool is missing. The paste keystroke (xdotool/osascript/SendKeys) stays per-OS since there's no cross-platform alternative.

**Decision details:** Drop the per-OS clipboard write in `packages/cli/src/util/clipboard.ts` and use `clipboardy.write(text)`. Add `clipboardy` to `packages/cli/package.json`. The HID shim section in the original CONTEXT (Area 1) is SUPERSEDED — `entry.tsx` continues to call `methods.pasteText(...)`, just with a more reliable backend. The `select_command_shortcode` config field is removed (the HID shim path it was designed for no longer exists).

**Options not chosen:**
- (a, HID shim rebuild) rejected: user explicitly does not want a new shim; they want the existing pasteText fixed.
- (a, mixed per-OS semantics) rejected: superseded by user's choice to use clipboardy.
- (b, all direct keystroke) rejected: Windows SendKeys can't reliably send arbitrary unicode.
- (c, all clipboard+paste) rejected: same as today, doesn't fix the silent failure.

### Amendment A2: Paged-category button as internal core utility (new scope)

**Context:** `buildPageNavButton` lives inline in `packages/cli/src/builtin-addons/emoji-selector/index.ts:28-45` and `category.tsx` is emoji-specific. Future paginated addons (icon-picker, snippet-picker) would need to re-implement this. The user wants it extracted as a shared core utility.

**Options presented (location):**
- (a) `packages/cli/src/builtin-support/page-nav.ts` (Recommended) — semi-internal, importable by addons, not in public addon API
- (b) `packages/cli/src/addon/page-nav.ts` — public addon API
- (c) `packages/cli/src/core/pagination.ts` — internal to core

**User choice:** `packages/cli/src/core/pagination.ts` (option c).

**Follow-up options for render:**
- (a) Label + footer (Recommended) — `[2/5]` as primary label + `> Tap / < Dbl Tap` as footer line
- (b) Chip overlays — top-right "Tap >" / top-left "Dbl Tap" (Phase 49 original)
- (c) Label only, no hint

**User choice:** Chip overlays (option b).

**Rationale captured:** The user wants the chip overlays from the original Phase 49 design (small "Tap" / "Dbl Tap" chips in the corners) and the page count `[N/M]` as the primary label. The utility location is internal to core — not in the public addon API surface.

**Decision details:** New file `packages/cli/src/core/pagination.ts`. Exports helpers for: defining a paged-category button, generating per-page deck IDs, and building the n-2 page-nav button with chip overlays + `[N/M]` primary label. The emoji-selector migrates to use these helpers. Specific API names deferred to plan-phase.

**Options not chosen:**
- (a, builtin-support) rejected: user chose core.
- (b, public addon API) rejected: not in scope for user-facing addon config.
- (a, label + footer) rejected: user wanted the chip overlay design from Phase 49.
- (c, no hint) rejected: explicitly contradicts the user's "it should show the [current page]/[total pages] / Tab: > < Dbl tap" requirement.

### Amendment A3: navigateToDeck noHistory flag (new scope)

**Context:** Paginated emoji subdecks push every page onto the history stack. The user wants the back button on a paginated page to go to the parent, not the previous page (so back from `emoji-smileys-p2` → main, not → `emoji-smileys-p1`).

**Options presented:**
- (a) Options object, default true (Recommended) — `navigateToDeck(deckId, options?: { addToHistory?: boolean })`
- (b) Positional with default — `navigateToDeck(deckId, addToHistory = true)`
- (c) Split into two methods — `navigateToDeck(deckId)` and `replaceDeck(deckId)`

**User choice:** Options object, default true (option a).

**Rationale captured:** Options object is the modern TS pattern, extensible (future flags like `replace`, `clearStack`), and backward compatible. Default `true` preserves current behavior for all existing callers. Opt-in `false` for the paginated emoji back paths.

**Decision details:** Public API change (additive, backward-compatible):
```ts
navigateToDeck(
  targetDeckId: string,
  options?: { addToHistory?: boolean }
): Promise<void>
```
Internal: `DeckController.navigateTo(targetDeckId, { push?: boolean } = { push: true })`. When `push: false`, the active deck is replaced without modifying the stack. `goBack` is unchanged — back navigation is its own semantic; the flag affects forward navigation only.

**Callers that opt in to `addToHistory: false`:**
- The new `definePagedCategoryButton` helper (A2) — every page-to-page transition passes `false` so the back stack only contains the entry point.
- The page-nav button (A2) — tap and double-tap both pass `false`.
- Anything outside the emoji-selector: unchanged.

**Options not chosen:**
- (b, positional) rejected: less extensible than options object.
- (c, split methods) rejected: doesn't compose with the existing `methods` API surface; users would need to know two method names.

---

## Areas Deferred to Plan-Phase (Amendment-Specific)

- Exact API names for `core/pagination.ts` helpers (candidates in 49-CONTEXT.md `<amendments>` A2).
- Whether the `select_command_shortcode` config field is removed outright or kept as a no-op override (49-CONTEXT.md says removed).
- The exact `Chip` positioning: top-left "Tap" and bottom-right "Dbl Tap" (the existing Phase 49 design), but the visual sizes and `tone` props may need to be adjusted for the new `[N/M]` primary label.
