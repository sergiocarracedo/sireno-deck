# Phase 42: System-Reserved Back Button - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Hard-reserve the last key slot of every deck on the Stream Deck. Main deck renders a subtle "home" indicator at the reserved slot. Subdecks render a core-owned back button at the reserved slot with: tap → pop the navigation stack, hold (≥600ms) → restore to main deck. Lock-session deck is the exception and does not get a reserved slot.

This is the only cross-cutting core change in v1.4. It touches config validation (rejecting buttons at reserved slot with override), runtime (injecting the system back button), and every addon's config authoring (none can claim the reserved slot).

</domain>

<decisions>
## Implementation Decisions

### Reserved slot semantics
- The reserved slot is the LAST position in the deck layout (highest position number, e.g., position 14 on a 15-key device)
- For a deck with `keyCount` keys, position `keyCount - 1` is reserved
- Every deck (main + all subdecks) has a reserved slot EXCEPT the lock-session deck
- Reserved slot is hard-reserved at config validation time
- A config flag `allow_reserved_slot_override: true` (at the deck or root level) opts out of validation; the warning is logged but the build proceeds

### Main deck reserved slot
- Renders a subtle "home" indicator (a faint label or dot) inside an otherwise empty ButtonSurface
- Visual: a single small "Home" label or icon at low opacity using the theme's tone tokens
- Theme can override via the existing `ButtonFrame` chrome; if no override, the core default applies
- Tapping the home indicator is a no-op (already on home)
- The home indicator is always rendered, never empty/invisible

### Subdeck reserved slot
- Renders a core-owned back button at the reserved slot
- Visual: a back chevron icon + "Back" label, using theme color tokens (tone-foreground, tone-primary)
- Theme can override the icon and/or label via theme assets (theme asset override system, like other theme-overrideable surfaces)
- If no theme override, the core default ("back chevron + 'Back'") applies

### Back button behavior
- **Tap:** pop one entry from the navigation stack. If the stack only has the current deck, this is a no-op.
- **Hold (≥600ms):** restore the navigation stack to `[mainDeckId]`. Clears any deeper navigation history.
- Hold detection reuses the existing 600ms hold timer from `addon/api.ts:85` (no new timer constant)
- Back button is core-owned: it's not registered as an addon button, it's injected at runtime by the deck controller

### Validation
- Config validation: when building any deck, the position `keyCount - 1` is rejected if claimed by an addon button
- Error message: `Button at reserved slot (position N) in deck "<id>" cannot be claimed by addons. Reserved for the system back button. Use "allow_reserved_slot_override: true" to override.`
- Override flag: `allow_reserved_slot_override: true` on the deck (or root) silences the validation. The reserved slot is then filled by the addon, and the system back button is NOT rendered for that deck.
- Lock-session deck: validation skips the reserved-slot check (the lock deck has no back button by design)

### Lock-session deck exception
- The lock-session deck is identified by `session.locked_deck` config
- Lock-session decks have no reserved slot — all `keyCount` slots are available for buttons
- No back button on the lock-session deck (Phase 11 decision: locked-mode is isolated from navigation)

### Agent's Discretion
- Exact visual style of the "home" indicator (icon vs label, exact opacity)
- Where the runtime injects the back button in the deck render pipeline (decorator pattern vs explicit render)
- Whether the back button is a "core button" definition in the addon registry or a runtime-injected special case
- Theme asset naming convention for back-button override (e.g., `assets/back-button.svg` vs `assets/system-back.svg`)

</decisions>

<specifics>
## Specific Ideas

- **Stack-based goBack** is the chosen back semantics — this reuses the existing `controller.goBack()` / `controller.restoreStack()` methods already in the runtime, no new tracking needed
- **Theme overridable** is the right balance: themes can brand the back button (e.g., custom icon for a game's subdeck) but a sensible default ships out of the box
- **Subtle "home" indicator** is chosen over a pure empty well so the user understands the slot is intentionally empty, not a missing button

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/ARCHITECTURE.md` — "System-reserved back button" section
- `/works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md` — relevant gotchas
- `/works/opensource/sireno-deck/.planning/research/v1.4/SUMMARY.md` — recommended approach
- `/works/opensource/sireno-deck/.planning/REQUIREMENTS.md` — `SRB-01` through `SRB-05`
- `/works/opensource/sireno-deck/.planning/phases/42-system-reserved-back-button/...` (this file)
- `/works/opensource/sireno-deck/packages/cli/src/addon/api.ts:85` — existing 600ms hold timer
- `/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts` — deck controller with goBack / restoreStack methods
- `/works/opensource/sireno-deck/packages/cli/src/core/schemas.ts` — config validation, where `allow_reserved_slot_override` and `keyCount` checks live
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/core-buttons/` — existing core buttons (change-deck, action, etc.) for patterns
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/` — emoji-selector for multi-page (Phase 46) context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`addon/api.ts:85` hold timer** — the 600ms threshold is defined here. The new back button can reuse `useButtonActionCommand` or similar pattern for the hold gesture
- **Deck controller `goBack` / `restoreStack`** — already in `deck/runtime.ts`. Back button just calls these
- **`defineMountedButton`** from `addon/api` — used by all current buttons. The back button can be a mounted button OR a runtime-injected special case
- **ButtonSurface component** — `packages/cli/src/ui/` — standard container for all button content
- **Color tokens** — `tone-foreground`, `tone-primary` etc. are the theme-aware color variables

### Established Patterns
- **All buttons are addon-defined** — the back button breaks this pattern by being core-owned. Justified because the back button is universal and theme-agnostic in its default form
- **Config validation in `core/schemas.ts`** — zod schema rejects invalid configs before they reach the runtime
- **Deck layout is `keyCount`-driven** — `resolveDeckLayout(keyCount)` returns columns/rows
- **Theme asset pipeline** — themes can declare `assets/` in their manifest and the runtime injects URLs

### Integration Points
- **Config schema (`core/schemas.ts`)** — add `allow_reserved_slot_override?: boolean` and a deck-level validation that rejects buttons at the reserved slot
- **Deck runtime (`deck/runtime.ts`)** — when rendering a deck, after user-defined buttons are placed, inject the system back button (or home indicator) at the reserved slot if not overridden
- **Addon registry / button definitions** — does NOT need a new entry; the back button is runtime-injected, not addon-defined
- **Theme assets** — themes can declare `assets/system-back.svg` to override the back button visual

</code_context>

<deferred>
## Deferred Ideas

- **Configurable back button position per deck** — deferred; the reserved slot is always last, period
- **Back button label/icon for each language** — out of scope; the label is "Back" (English) for v1.4, theme can override
- **Back button history visualization** — out of scope; no "go back 3 levels" UI
- **Custom back-button animations** — out of scope; standard button transition

</deferred>

---
*Phase: 42-system-reserved-back-button*
*Context gathered: 2026-06-04*
