# Phase 49: Emoji-Selector UX Revamp — Context

**Gathered:** 2026-06-06
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite the built-in `emoji-selector` addon based on real-world feedback so each subdeck renders real-emoji glyphs (not `U+1Fxxx` placeholders), ships a per-OS HID keyboard-stroke output for tap (emoji) and double-tap (shortcode), paginates subcategories using a single `n-2` page-nav button with `Chip` overlays, and exposes a new addon-provided entry button that renders a 2×3 grid of six emojis as a first-class button type. Subdeck back behavior moves to a deck-config-decorated system back driven by `system_back_tap_command` / `system_back_hold_command` config keys (addons can opt in to override the default `goBack` / `restoreStack`).

</domain>

<decisions>
## Implementation Decisions

### HID output mechanism (Per-OS shim)
- **Tap action:** When the user does not supply a `select_command`, the addon uses a per-OS default that delivers the emoji to the host's currently focused input via a HID keyboard-stroke shim:
  - **Linux:** `xdotool type --clearmodifiers <emoji>` (with `wl-copy` fallback for Wayland-only sessions).
  - **macOS:** `osascript -e 'tell application "System Events" to keystroke "<emoji>"'`.
  - **Windows:** PowerShell `[System.Windows.Forms.SendKeys]::SendWait(<emoji>)`.
  - **Unsupported OS / missing tool:** Button render shows an honest "not available on this OS" state (same pattern as the `media-volume` button from Phase 44).
- **Double-tap action:** Sends the shortcode wrapped in colons (e.g. `:fire:`) via the same shim. A new optional `select_command_shortcode` config field overrides the default per-button.
- **Config contract:** Keep the existing `select_command` (already in `EmojiEntryButtonSchema`) for the tap path. Add a new optional `select_command_shortcode` for the double-tap path. If a user supplies `select_command` but not `select_command_shortcode`, double-tap is a no-op (no surprise behavior).

### Real emoji rendering (native font stack)
- **Default fallback:** Replace `getEmojiFallbackLabel`'s `U+1Fxxx` text path with rendering the raw emoji character via a font stack: `'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif`. The browser (or emulator) picks the first available emoji font.
- **Branded overrides stay:** The existing 12 hand-curated SVG icons (`EMOJI_ICON_ASSETS` in `support.tsx`) remain as deliberate visual overrides for the bundled brand set. They take precedence over the font-stack fallback.
- **Render size:** Each per-emoji entry button renders the glyph at the largest readable size that fits the button surface, using the existing `Text` size ladder with a new top step (`5xl` or new `giant` token). No small icon-and-label combo on entry buttons.

### n-2 page nav model (single button, tap/double-tap)
- **Single button at position `n-2`:** Replaces the Phase 46 prev@`keyCount-3` + next@`keyCount-2` pair. For a 15-key deck, this lands at position 13 (one slot before the system-reserved slot 14).
- **Bindings:** Reuses the Phase 34 `commands.tap` / `commands.double-tap` action contract on the existing `change-deck` button type. Tap = `navigateToDeck(nextDeckId)`. Double-tap = `navigateToDeck(prevDeckId)`. When the active page is the last, double-tap is a no-op (no wrap-around). When the active page is the first, tap is the only available action.
- **`Chip` overlays:** The button renders two small `Chip` elements overlaid on the button surface: "Tap" (top-left) and "Dbl Tap" (bottom-right). Both chips use the `xs` text size and `tone="muted"` to keep the visual hint unobtrusive. The button's main content is a nav-arrow icon (e.g. `chevron-right` rotated for the prev case) when no other content is needed.
- **Single-page category:** The n-2 button is omitted (consistent with Phase 46's no-nav-on-single-page rule).
- **Per-page layout:** 12 emoji entries (positions 0-11) + n-2 page nav (position 13) + system back (position 14). Position 12 is intentionally empty (visual breathing room between the emoji grid and the nav button).

### Catalog source + subcategories (hand-curated JSON)
- **File location:** `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` (committed to the repo).
- **Schema:** Array of `{ id, label, icon, emojis: [{ char, shortcode }] }` where `id` is the subcategory slug, `label` is the user-facing display name, `icon` is an `addon://` SVG reference, and `emojis` is the per-subcategory list. Composite groups (e.g. "Smileys and People" in the piliapp reference) are pre-split: separate `smileys` and `people` entries that each own their own emoji list.
- **Source:** Hand-curated from `https://es.piliapp.com/emoji/list/` as a reference. The shipped subset covers the 8-12 most common subcategories (Smileys, People, Animals, Nature, Food, Activities, Travel, Objects, Symbols, Flags) with ~20-60 emojis each. Each entry has the unicode character and the conventional `:shortcode:` form (e.g. `🔥` → `fire`).
- **No scraping / vendoring:** piliapp is reference-only; the data is curated. `unicode-emoji-json` is not vendored because its grouping is coarser than the piliapp reference.

### Subdeck back behavior (addon-decorated system back)
- **Two new optional deck config fields:** `system_back_tap_command` (string, runs via the shared command executor) and `system_back_hold_command` (string, runs via the shared command executor with the same 600ms hold timer from `addon/api.ts`).
- **Runtime behavior:** When the deck is active and these fields are set, the core-owned `system-back` instance at the reserved slot routes its tap to `runCommand(system_back_tap_command)` and its hold to `runCommand(system_back_hold_command)` instead of the default `goBack` / `restoreStack([])`. The command runs against the current host context.
- **Emoji-selector usage:** The emoji-selector's main deck declares `system_back_tap_command` to navigate to the host's parent deck via `navigateToDeck(parentDeckId)` (a registered command helper, e.g. `sireno navigate --target <id>`). The hold command resets to the global home deck.
- **Why not a new button type:** Keeps the system-reserved slot authoritative. The runtime stays the single owner of "what happens when the user presses the back slot on this deck" — addons just supply the policy via config.
- **Default behavior unchanged:** Decks without these fields still get the SRB-03 default (tap=parent via `goBack`, hold=main via `restoreStack([])`).

### Addon-provided entry button
- **New button type:** `emoji-entry-button` (the addon's own type, distinct from the existing per-emoji `emoji-entry-button` — naming collision to be resolved in plan-phase: rename existing to `emoji-emoji-button` or rename the new one to `emoji-launcher`).
- **Render:** Full-surface 2×3 grid of six emojis chosen to represent the addon's full surface. The grid uses Tailwind grid utilities with consistent gap and centered alignment. Each cell is a Text component rendering the emoji character via the native font stack.
- **Tap:** `navigateToDeck(target_deck_id)` where `target_deck_id` is the first page of the emoji-selector main deck.
- **Config:** `{ target_deck: string, label?: string, icon?: string }` — minimal; the render is fully derived from the addon's six representative emojis.
- **Discoverability:** Documented in the addon's button list. Users add it to their deck config like any other `core-buttons`-style button (`{ type: 'emoji-entry-button', target_deck: 'emoji', label: 'Emojis' }`).

### Backward compatibility
- **Existing configs:** All current emoji-selector configs continue to work. The new `select_command_shortcode` is optional; the new system-back decoration is optional; the new entry button is opt-in.
- **Test coverage:** Existing 11 emoji-selector tests remain green. Add coverage for: font-stack fallback path, per-OS shim default command resolution, single-page category with no nav button, multi-page nav (tap/double-tap wiring), subdeck back decoration (command paths and defaults).

### Agent's Discretion
- Exact font stack ordering (the recommended order is documented but final ordering is implementation-detail).
- Whether the n-2 button uses an icon (`chevron-right` or similar) or just the two `Chip` overlays in its main area.
- The exact 8-12 subcategories included in the curated JSON (recommendation is documented, final list is implementation-detail).
- Whether the new entry button shares the `emoji-entry-button` type name (and the existing per-emoji entry is renamed) or uses a fresh type name.
- Visual treatment of the 2×3 grid (gap size, alignment, font size per cell).
- Per-OS shim fallback chains (e.g. `xdotool` vs `wl-copy` on Linux).

</decisions>

<specifics>
## Specific Ideas

- The user provided a reference image showing the entry button: 2×3 grid of 6 emojis, the exact layout the new `emoji-entry-button` (or `emoji-launcher`) must render.
- The user wants the catalog grouped per the piliapp.com reference: `https://es.piliapp.com/emoji/list/`. Composite groups must be split: "Smileys and People" → "Smileys" + "People". Other examples: "Animals and Nature" → "Animals" + "Nature", "Food and Drink" → "Food" + "Drink" (verify against piliapp structure during planning).
- The user explicitly wants tap to send the emoji and double-tap to send the shortcode (`:fire:` form). The two should use the same HID shim path; only the payload differs.
- The `Chip` overlays on the n-2 page-nav button should show exactly "Tap" and "Dbl Tap" — no abbreviations.
- The user said "the emoji image must be bigger" — interpreted as full-surface or near-full-surface glyph per entry button, not the current small-icon-and-label layout.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 49 description (added 2026-06-06)
- `.planning/phases/46-emoji-selector-multi-page/46-CONTEXT.md` — Prior phase decisions on prev/next placement, page sizing, deck ID naming
- `.planning/phases/46-emoji-selector-multi-page/46-VERIFICATION.md` — What is currently shipping in Phase 46
- `.planning/REQUIREMENTS.md` — EMO-01..EMO-05 (all complete); new EMO-06..EMO-14 to be assigned at plan-phase
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — Current `createDecks` implementation (will be rewritten)
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — `CATEGORY_DEFINITIONS` and `getEmojiFallbackLabel` (to be replaced/extended)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — Current per-emoji entry button (tap path)
- `packages/cli/src/addon/api.ts` — Phase 34 `useButtonActionCommand` and `commands.tap` / `commands.hold` / `commands.double-tap` schema
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — Existing change-deck button type
- `packages/cli/src/action/executor.ts` — `executeCommand` path that the per-OS shims will use
- `packages/cli/src/deck/system-back-injection.ts` — `shouldInjectSystemBack` / `getSystemBackButtonInstance` (will gain config-driven tap/hold command)
- `packages/cli/src/deck/runtime.ts` — `system-back` instance wiring (will be updated to honor the new optional config)
- `packages/cli/src/ui/Chip.tsx` — `Chip` component for the n-2 button overlay
- `packages/cli/src/ui/Text.tsx` — `Text` component (used for the font-stack emoji glyph render)
- `packages/cli/src/builtin-addons/media-volume/` — Pattern reference for per-OS shim adapters with honest unsupported states
- `https://es.piliapp.com/emoji/list/` — External reference for the catalog split and per-subcategory grouping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Chip` component (`packages/cli/src/ui/Chip.tsx`): ready to use for the "Tap" / "Dbl Tap" overlays. The size + tone props cover the small-muted variant needed.
- `Text` component (`packages/cli/src/ui/Text.tsx`): existing `fontFamily` prop or new font-stack extension will carry the native emoji font stack. The `size` ladder has tokens for the new larger emoji render.
- Phase 34 `commands.tap` / `commands.double-tap` action contract (`packages/cli/src/addon/api.ts`): the action commands the n-2 button uses for tap=next, double-tap=prev.
- `executeCommand` action executor (`packages/cli/src/action/executor.ts`): the per-OS shim commands route through the existing shell execution path with the same host-context placeholder resolution.
- System-back injection (`packages/cli/src/deck/system-back-injection.ts`): the runtime-side logic to extend with the new optional command fields.

### Established Patterns
- Per-OS shim with honest "unsupported" state: see `media-volume` addon (Phase 44) for the pattern of `LinuxAdapter`, `MacosAdapter`, `WindowsAdapter` modules with per-OS `isSupported()` checks. The emoji-selector should follow the same shape.
- `createDecks` returns `Record<string, DeckDefinition>` keyed by deck ID — the rewrite keeps this contract.
- Deck ID naming convention from Phase 46 (e.g. `${deck.id}-${category.id}-p${pageNumber}`) carries over.
- Addon-owned button types follow the `defineMountedButton` pattern with `configSchema`, `render`, optional `onTap` / `onHold` / `onDoubleTap`. The new entry button uses the same shape.

### Integration Points
- `createDecks` in `index.ts`: full rewrite. The new layout is 12 emojis (0-11) + n-2 page nav (13) + system back (14), with position 12 empty.
- `CATEGORY_DEFINITIONS` in `support.tsx`: replaced with a JSON loader reading `data/categories.json`. The TS export becomes a thin re-export of the parsed JSON for test access.
- `getEmojiFallbackLabel` in `support.tsx`: kept as a no-op or removed; the render path no longer needs the U+1Fxxx text.
- New `EmojiEntryButtonSchema` and `EmojiSelectorDeckSchema` in `support.tsx`: add the optional `select_command_shortcode` and the optional `system_back_tap_command` / `system_back_hold_command` fields.
- Runtime `system-back` case in `packages/cli/src/deck/runtime.ts` (line ~852): extend to read the active deck's decoration config and route tap/hold through `runCommand` when present.
- New `data/categories.json` file at the addon path: first-class asset loaded via `import categories from './data/categories.json'`.

### Key Calculation
- Per-page emoji count for 15-key deck: `12` (positions 0-11). Position 12 is empty. Position 13 is the n-2 page nav. Position 14 is the system back.
- n-2 button position is `keyCount - 2` (always the slot immediately before the system-reserved slot).

</code_context>

<deferred>
## Deferred Ideas

- **Multi-language emoji labels:** The bundled `:shortcode:` is English-only. Localization is a future phase.
- **Emoji search:** Free-text search across the catalog is a separate capability that belongs in its own phase.
- **Recent / frequently-used emoji history:** Persistent across restarts requires a store layer; out of scope here.
- **Theme overrides for the new entry button's 2×3 grid:** Built-in render only for v1.4; theme overrides can come later via the existing `Surface` component override pattern.
- **Per-emoji `commands.hold` action:** The new entry button only uses tap. Per-emoji hold can be added later if a use case emerges.

</deferred>

<amendments>
## Post-Ship Amendments (2026-06-06)

Three amendments captured in a follow-up discussion after phase 49 verification. A1 modifies a locked decision (the original HID shim spec is dropped, replaced by fixing the existing `pasteText` path with `clipboardy`). A2 and A3 add new scope. Plans 49-01..49-04 remain the record of what shipped; this section describes what changes next.

### A1. Replace HID shim with `clipboardy` (supersedes "HID output mechanism (Per-OS shim)")

The original Phase 49 spec called for a per-OS HID keyboard-stroke shim. Post-ship feedback reported that the existing `pasteText` fallback (clipboard + Cmd/Ctrl+V) is the intended path but is silently failing in the user's environment. The user does NOT want a new HID shim; they want the existing clipboard-paste path fixed.

**Decision:** Use the `clipboardy` npm package for the cross-platform clipboard write, replacing the per-OS `pbcopy` / `xclip` / PowerShell implementations. The paste keystroke (`xdotool ctrl+v` / `osascript cmd-v` / `SendKeys ^v`) remains per-OS — there is no cross-platform alternative for the keystroke step.

**Why `clipboardy`:**
- Surfaces clear errors when the underlying tool (xclip, pbcopy, etc.) is missing — fixes the "emojis are not being delivered" silent-failure bug. The current `execa`-spawned `xclip` swallows stderr in subtle ways.
- Active maintenance, used internally by `execa`.
- Drops ~30 lines of per-OS conditional code from `packages/cli/src/util/clipboard.ts`.

**Impact on shipped code:**
- `packages/cli/src/util/clipboard.ts`: rewritten to use `clipboardy.write(text)` for the write step. The per-OS paste keystroke stays. Both `pasteText` (full op) and `writeClipboard` (if exposed) benefit.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx`: unchanged at the call site (still `methods.pasteText(...)`); the new backend flows through automatically.
- `select_command_shortcode` config field: removed. With the HID shim path gone, double-tap falls back to `methods.pasteText(shortcode)`. If a user supplies `select_command` for tap, double-tap becomes a no-op (matches the original CONTEXT contract for the `select_command_shortcode` unset case).
- `packages/cli/package.json`: add `clipboardy` as a dependency.

### A2. Paged-category button as internal core utility

The Phase 46 / 49 `buildPageNavButton` (currently inline in `packages/cli/src/builtin-addons/emoji-selector/index.ts`) and the emoji-specific `category.tsx` are extracted into a shared internal core utility, so future addons that paginate (e.g. icon-picker, snippet-picker) can reuse the same pattern.

**Location:** `packages/cli/src/core/pagination.ts` (internal to core; addons import the helpers directly, NOT exposed in the public addon API surface).

**Render:** Per the Phase 49 original design — two `Chip` overlays (top-left "Tap", bottom-right "Dbl Tap") on a button with `[N/M]` as the primary label. Per-page layout unchanged: 12 entries (positions 0-11) + n-2 page nav (position 13) + system back (position 14); position 12 is empty as visual breathing room.

**API surface (candidates — exact names deferred to plan-phase):**
- `definePagedCategoryButton({...config})` — high-level helper returning a button config for a category tile in the main deck; tap navigates to the first page of the category with `addToHistory: true`.
- `paginateDecks({...})` — generator that produces the per-page deck IDs given a base ID, page size, and total count.
- `buildPageNavButton(currentPage, totalPages, prevDeckId, nextDeckId)` — the per-page nav button at the n-2 slot; tap and double-tap both pass `addToHistory: false` (per A3).

### A3. `navigateToDeck` noHistory flag

The paginated emoji subdecks currently push every page onto the history stack. The user wants the back button on a paginated page to go to the parent (the main emoji deck, or whatever spawned the pagination), not the previous page.

**API change (additive, backward-compatible):**
```ts
navigateToDeck(
  targetDeckId: string,
  options?: { addToHistory?: boolean }
): Promise<void>
```
Default: `addToHistory: true` (preserves current behavior for all existing callers — `core-buttons/change-deck.tsx`, `emoji-launcher`, `category.tsx`, etc.).

**Internal change:** `DeckController.navigateTo(targetDeckId, { push?: boolean } = { push: true })`. When `push: false`, the active deck is replaced without modifying the stack. `goBack` is unchanged — back navigation is its own semantic; the flag affects forward navigation only.

**Callers that opt in to `addToHistory: false`:**
- The new `definePagedCategoryButton` helper (A2) and the page-nav button (A2) — every page-to-page transition passes `false` so the back stack only contains the entry point.
- Direct navigation from the emoji main deck into the first page of a category: `true` (so back from the first page returns to main).
- Anything outside the emoji-selector: unchanged.

</amendments>

<canonical_refs_addendum>
## Canonical References — Amendment-Specific

**Downstream agents implementing the amendments MUST also read these:**

- `packages/cli/src/util/clipboard.ts` — current per-OS clipboard impl, to be rewritten to use `clipboardy`
- `packages/cli/src/deck/controller.ts` — `DeckController.navigateTo` to gain `push: boolean`
- `packages/cli/src/addon/api.ts` — `AddonButtonMethods.navigateToDeck` signature to add optional `options` arg
- `https://www.npmjs.com/package/clipboardy` — `clipboardy.write(text)` API surface
- `packages/cli/src/builtin-addons/emoji-selector/index.ts:28-45` — current `buildPageNavButton` (to be extracted)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/category.tsx` — current emoji-specific category button (to be extracted)

</canonical_refs_addendum>

---

*Phase: 49-emoji-selector-ux-revamp*
*Context gathered: 2026-06-06*
*Post-ship amendments: 2026-06-06*
