# Phase 42 Discussion Log

**Date:** 2026-06-04
**Phase:** 42 — System-Reserved Back Button
**Mode:** standard

## Carrying Forward

From v1.4 kickoff (locked):
- Hard-reserved last slot
- Main deck: empty placeholder (no render) — REFINED in this phase
- Subdecks: core-owned back button (tap → previous, hold → home)
- Reuse 600ms hold timer

From v1.4 research:
- `controller.restoreStack([mainDeckId])` for hold-to-home
- 600ms threshold in `addon/api.ts:85`
- Three coupled edits: position validation, runtime injection, controller reuse

## Gray Areas Discussed

### 1. Main deck reserved slot

**Options considered:**
- Pure empty well — rejected
- **Subtle "home" indicator** ✅ chosen
- Themed transparent placeholder — rejected

**Decision:** Render a faint "Home" label or dot in the reserved slot of the main deck. Lets the user know the slot is intentionally empty, not missing.

### 2. Back button visual

**Options considered:**
- Chevron icon only — rejected
- Icon + "Back" label — initial default
- **Theme overridable, fallback to Icon + "Back" with color tokens** ✅ chosen

**Decision:** The default core back button is a back chevron + "Back" label using theme tone tokens. Themes can override the icon/label via the existing theme asset pipeline. The override is opt-in (not required).

### 3. Validation strictness

**Options considered:**
- Hard reject with helpful error — rejected
- **Warning + override flag** ✅ chosen
- Silent ignore — rejected

**Decision:** Validation WARNS about a button at the reserved slot. The user can set `allow_reserved_slot_override: true` (deck-level or root) to silence the warning AND disable the system back button for that deck.

### 4. Back stack tracking

**Options considered:**
- **Stack-based goBack** ✅ chosen
- Parent-deck field — rejected (more complex config)

**Decision:** Reuse existing `controller.goBack()` / `controller.restoreStack()`. Tap pops the stack; hold restores to `[mainDeckId]`.

## Agent's Discretion

- Exact visual style of the "home" indicator
- Where in the render pipeline the runtime injects the back button
- Whether the back button is a core button definition in the addon registry or a runtime-injected special case (current leaning: runtime-injected special case, not a registered button)
- Theme asset naming convention for back-button override

## Deferred Ideas

- Configurable back button position per deck
- Per-language back button labels
- Back button history visualization
- Custom back-button animations

## Next

`plan-phase 42` — convert these decisions into executable plans.
