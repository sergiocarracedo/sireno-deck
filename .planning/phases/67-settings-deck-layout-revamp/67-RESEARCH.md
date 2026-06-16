---
phase: 67
created: 2026-06-15
workflow: plan-phase
---

# Phase 67 Research: Settings Deck Layout Revamp

Internal refactor — no new external dependencies. Research is codebase-only.

## Don't Hand-Roll

The user-facing behavior of Phase 67 is "settings deck buttons live at predictable positions
and render with shared UI primitives". Three primitives already exist for this:

- **`IconLabelSurface`** (`packages/cli/src/ui/surfaces/IconLabelSurface.tsx`, 25 lines) — drop-in
  replacement for the hand-rolled `<Icon>` + `<Text>` pair in `brightness-up.tsx:19-29` and
  `brightness-down.tsx:20-30`. Default render is `<div flex flex-col items-center
  justify-center gap-1><Icon size={30} /><Label /></div>` — visually equivalent to the
  current code (the current code uses `<Icon size={32}>` instead of `size={30}`, so a small
  icon-size delta is expected; keep the explicit `size` prop in the migration if the size
  must stay at 32). Theme-overridable via `useThemeUiPresentation().surfaces.iconLabel`.

- **`Label`** (`packages/cli/src/ui/Label.tsx`, 29 lines) — drop-in for the
  `<Text size="xl" tone="primary">` + `<Text size="xs">` pair in
  `current-brightness.tsx:13-23`. SETTINGS-07 explicitly mandates this. The default render
  is `<Text size="md" uppercase leading-tight tracking-tight fit="ellipsis" tone="primary"
  typography="main" />` — note the default size is `md`, not `xl`. If the visual size must
  be preserved, pass an explicit `<Text size="xl">` inside the `<Label>` or extend Label's
  props to accept a `size` override.

- **`createInternalDecks(keyCount)`** (`packages/cli/src/deck/runtime.ts:294-299`, 6 lines) —
  the dynamic layout builder. Currently returns the static `INTERNAL_SETTINGS_DECK`
  constant regardless of `keyCount`. Phase 67 makes the settings deck entry inside
  `createInternalDecks` actually use `keyCount` to compute positions.

**Anti-pattern: building a new surface primitive for "brightness up/down with icon and
text"** — that's exactly what `IconLabelSurface` already does. Don't author a new component.

**Anti-pattern: hand-rolling `<Text>` JSX in `current_brightness`** — SETTINGS-07 says
`<Label>`. Use it.

**Anti-pattern: hard-coding positions 0-3 in a `const INTERNAL_SETTINGS_DECK`** — that's
the current state. Phase 67 replaces it with positions computed from `keyCount`.

## Common Pitfalls

- **Position math off-by-one for small keyCount values.** A 6-key Stream Deck has
  n=6, so n-3=3, n-2=4, n-1=5, plus position 0. That's 4 distinct positions (0, 3, 4, 5)
  on a 6-key grid, which is OK. A 32-key grid (n=32): n-3=29, n-2=30, n-1=31, plus 0.
  The math is `position = keyCount - 1 - offset` where `offset` is 0, 1, 2 for
  n-1, n-2, n-3. Verify with a table-driven test.

- **Position collision on tiny keyCount.** For keyCount=4, n-3=1, n-2=2, n-1=3, plus
  position 0. That's 4 distinct positions (0, 1, 2, 3). For keyCount=3, n-3=0, which
  collides with position 0. The plan should either reject keyCount<4 (no settings
  deck for 3-key device) or handle the collision explicitly. **This is a real
  conflict that needs a decision in the plan.**

- **Test ordering change breaks snapshot of `internalSettingsAddon.buttons` order.** The
  test in `packages/cli/src/builtin-addons/internal-settings/index.test.ts:10-15` asserts
  the addon exports buttons in order [up, down, current, logo]. **DECK positions change
  but ADDON declaration order does not** (D-08 puts down at n-3 and up at n-2, but the
  addon manifest array still has up before down). The test should pass unchanged.

- **`createInternalDecks` is called from `runtime.ts:373`** with `options.keyCount ?? 15`.
  The caller already handles the default. Don't re-default inside the function.

- **`data-sireno-settings-button` attribute on each button's root `<div>`** is used by
  the runtime to identify settings buttons for click handling. The migration to
  `IconLabelSurface` must preserve this attribute (currently it's on the inner `<div>`,
  not on `ButtonSurface`). If `IconLabelSurface` doesn't accept a `data-*` prop, the
  attribute must be on the outer `ButtonSurface` or on the `IconLabelSurface` root.

- **Locked deck uses `centerStart = Math.floor(keyCount / 2) - 1`** for its 3 buttons.
  This is a different positioning strategy (centered) and should not be conflated with
  the n-1 positioning for the settings deck.

- **Icon size delta.** Current code uses `<Icon size={32}>`, `IconLabelSurface` default
  is `size={30}`. If size must stay at 32, pass it explicitly: `<IconLabelSurface
  icon={{ name: 'sun', size: 32 }} label="Brighter" />`. (Verify by reading the
  existing brightness-up rendering: `size={32}`.)

## Existing Patterns in This Codebase

**Dynamic n-aware deck pattern (model: locked deck):**
```typescript
function createInternalLockedDeck(keyCount: number): DeckConfig {
  const centerStart = Math.floor(keyCount / 2) - 1
  return {
    id: INTERNAL_LOCKED_DECK_ID,
    name: 'Locked Session',
    system: true,
    buttons: (['hour', 'separator', 'minute'] as const).map((slot, index) => ({
      config: { slot },
      definition: lockedTimeTileButtonDefinition,
      full: true,
      position: centerStart + index,
      type: 'locked-time-tile',
    })),
  }
}
```
This is the established pattern for keyCount-aware decks. Phase 67 follows it for
the settings deck entry.

**Surface primitive convention:**
- Each surface lives in `packages/cli/src/ui/surfaces/`
- Accepts a single render prop pattern
- Theme-overrides via `useThemeUiPresentation().surfaces[name]`
- Exported from `packages/cli/src/ui/index.ts`

**Internal button pattern (model: all 4 internal-settings button files):**
- Each is a separate file under `packages/cli/src/builtin-addons/internal-settings/buttons/`
- Exports `{configSchema, onTap, render, type}`
- Uses `defineMountedButton` from `@/addon/api`
- The render function returns `<ButtonSurface>` with an inner `<div>` for layout

**Test pattern (model: `internal-settings/index.test.ts`):**
- 17 lines, single `it` block
- Asserts addon shape: `name`, `apiVersion`, `system`
- Asserts exact button type order
- No test exists for the runtime deck assembly — Phase 67 introduces this.

## Recommended Approach

**One plan, one vertical slice.** The phase is small and the changes are tightly coupled
(reordering positions + switching to shared primitives must land together for the new
layout to be coherent). A single plan `67-01-PLAN.md` (Wave 1, autonomous, ~5 tasks)
delivers:

1. **Make `createInternalDecks` actually use `keyCount` for the settings deck.** Replace
   the static `INTERNAL_SETTINGS_DECK` constant with a function-internal deck that
   computes positions: `{ position: 0, type: logo_version }, { position: n-3,
   type: brightness_down }, { position: n-2, type: brightness_up }, { position: n-1,
   type: current_brightness }`.

2. **Refactor `brightness-up.tsx` render to use `IconLabelSurface`.** Preserve the
   `data-sireno-settings-button` attribute (move it to `ButtonSurface` or to the
   `IconLabelSurface` root if the primitive accepts `data-*`).

3. **Refactor `brightness-down.tsx` render to use `IconLabelSurface`.** Same attribute
   preservation.

4. **Refactor `current-brightness.tsx` render to use `<Label>`.** Wrap the existing
   `<Text>` children in `<Label>` (or compose `<Label>` with explicit size override if
   the default `size="md"` is too small for a "50%" display).

5. **Add table-driven test for n-aware positioning.** Test positions for keyCount
   in [6, 9, 15, 32]. Assert position 0 = logo_version, n-3 = brightness_down,
   n-2 = brightness_up, n-1 = current_brightness. Skip or error on keyCount<4
   (decided in the plan).

**Out of scope (per CONTEXT.md):**
- `packages/cli/src/builtin-addons/brightness/` (standalone user-installable addon) —
  untouched.
- `logo_version` JSX — kept hand-rolled (no `IconLabelSurface` because no icon).
- REPLACE-LOGIC for the `data-sireno-settings-button` attribute: verify with the
  runtime how this attribute is consumed before removing it.

**Documentation drift (deferred to Phase 70):**
- `REQUIREMENTS.md` SETTINGS-05 / SETTINGS-06 textual update (D-02).
- `ROADMAP.md` Phase 67 success criteria line update.
- These are doc-only changes captured as a decision but not implemented in this phase.

**Files to modify:**
- `packages/cli/src/deck/runtime.ts` — `createInternalDecks` (delete `INTERNAL_SETTINGS_DECK` const, inline dynamic version)
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-up.tsx` — render refactor
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down.tsx` — render refactor
- `packages/cli/src/builtin-addons/internal-settings/buttons/current-brightness.tsx` — render refactor
- `packages/cli/src/builtin-addons/internal-settings/buttons/logo-version.tsx` — untouched (D-07)
- `packages/cli/src/builtin-addons/internal-settings/index.ts` — untouched (declaration order stays)
- `packages/cli/src/builtin-addons/internal-settings/index.test.ts` — untouched (asserts addon order, not deck positions)
- `packages/cli/src/deck/__tests__/internal-decks.test.ts` (new) — table-driven n-aware test

## Confidence

- IconLabelSurface / Label APIs: **HIGH** (verified by reading source)
- createInternalDecks exists and is called from runtime.ts:373: **HIGH** (verified)
- data-sireno-settings-button attribute consumer: **LOW** (not yet investigated; the
  plan must include a small read of runtime click-handling code to confirm whether the
  attribute is needed and where it should live)
- keyCount<4 collision behavior: **MEDIUM** (depends on actual smallest supported
  Stream Deck size; the plan should ask the user or default to "skip if keyCount<4")
