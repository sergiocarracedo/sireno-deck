---
phase: 67
created: 2026-06-15
workflow: discuss-phase
status: Ready for planning
---

# Phase 67 Context: Settings Deck Layout Revamp

Implementation decisions captured during `discuss-phase 67`. Closes SETTINGS-05, SETTINGS-06, SETTINGS-07 from v1.6.

<domain>
## Phase Boundary

Reorder the internal settings deck buttons so brightness controls land at the
right side of the grid (n-3, n-2, n-1) regardless of `keyCount`, and pin a
project-logo + version button at position 0. Replace hand-rolled `<Icon>` +
`<Text>` JSX in the brightness buttons with the existing `IconLabelSurface`
primitive. Replace the percent display in `current_brightness` with `<Label>`.
Update test assertions and the SETTINGS-06 requirement text accordingly.

The settings deck remains 4 buttons; their positions change, and their render
functions use existing primitives. No new components are built in this phase.
</domain>

<decisions>
## Implementation Decisions

### Position 0 holds the logo+version button
- **D-01:** Position 0 (top-left in default 15-key grid) renders `__sireno_internal_settings_logo_version`.
  Positions n-3, n-2, n-1 hold the brightness cluster (n-3 = darker, n-2 = brighter, n-1 = percent).
- **D-02:** `SETTINGS-06` requirement text is rephrased from "n-1 = project logo + version" to "position 0 = project logo + version". `REQUIREMENTS.md` and `ROADMAP.md` Phase 67 success criteria both updated.
- **D-03:** Layout is dynamic per `keyCount` (supports 6/9/15/32-key grids) using the existing `createInternalDecks(keyCount)` helper. The current static `INTERNAL_SETTINGS_DECK` constant in `runtime.ts:267-292` is replaced by a function call.

### `iconTextSurface` resolves to existing `IconLabelSurface`
- **D-04:** `SETTINGS-05` reference to `iconTextSurface` is treated as a misnamed reference to `IconLabelSurface` (already exported from `packages/cli/src/ui/surfaces/IconLabelSurface.tsx`, theme-overridable via `useThemeUiPresentation().surfaces.iconLabel`).
- **D-05:** `brightness_up` and `brightness_down` render functions refactor to `<IconLabelSurface icon="sun|moon" label="Brighter|Dimmer" />`. The default render of `IconLabelSurface` (icon size 30, label below, flex-col items-center) is sufficient — no custom render overrides needed.
- **D-06:** `current_brightness` refactors to use `<Label>` for both the `{N}%` line and the "Brightness" subtitle. The current hand-rolled `<Text size="xl">` + `<Text size="xs">` pair is replaced.
- **D-07:** `logo_version` keeps its current hand-rolled text rendering ("sireno" + "v1"). Not wrapped in `IconLabelSurface` because it has no icon. The user explicitly chose to leave it text-only.

### Order in the brightness cluster
- **D-08:** n-3 = `brightness_down` (darker / moon icon), n-2 = `brightness_up` (brighter / sun icon), n-1 = `current_brightness` (percent). Reading left-to-right on the bottom row: darker, brighter, percent.

### Agent's Discretion
- Exact test matrix for the dynamic layout (which `keyCount` values to test against the position-0/n-3/n-2/n-1 invariants).
- Whether to keep the `brightness` user-installable addon (separate from `internal-settings`) untouched — assumed yes, since the user said the work is in the internal-settings deck and the `brightness` addon is a distinct entity.
</decisions>

<specifics>
## Specific Ideas

- The user clarified the intent behind `iconTextSurface` in SETTINGS-05 by mapping it to the existing `IconLabelSurface`. No new surface primitive is needed.
- The user emphasized the logo+version button "must be created as internal builtin button and used in the settings deck" — confirming it belongs in `packages/cli/src/builtin-addons/internal-settings/`, not as a user-installable addon. The 4 internal button types already exist in this location; no new button type needs to be authored.
- The user chose dynamic n-aware layout over static n=15, supporting multiple Stream Deck sizes (6/9/15/32 keys).
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Settings deck requirements
- `.planning/REQUIREMENTS.md` — SETTINGS-05 (brightness controls in iconTextSurface at n-3/n-2), SETTINGS-06 (project logo + version at n-1 — to be rephrased to position 0), SETTINGS-07 (percent button uses Label).
- `.planning/ROADMAP.md` — Phase 67 entry (lines 122-131) with success criteria listing both n-1=percent and n-1=version (contradiction resolved by D-02).

### Surface primitives
- `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` — the `iconTextSurface` misreference target. 25 lines, signature `({ icon?: IconProps, label: string })`, default render is `<div flex flex-col items-center justify-center gap-1><Icon size={30} /><Label /></div>`. Theme-overridable via `useThemeUiPresentation().surfaces.iconLabel`.
- `packages/cli/src/ui/surfaces/MainLabelSurface.tsx` — sibling primitive for the same UI conventions (theme overrides, sub-surface pattern).
- `packages/cli/src/ui/surfaces/BarsSurface.tsx`, `SplitActionSurface.tsx`, `LabelValueListSurface.tsx` — other surface primitives already in the UI library.
- `packages/cli/src/ui/index.ts` — single export point for all surfaces and primitives (Label, Icon, Text).

### Internal settings button types
- `packages/cli/src/builtin-addons/internal-settings/index.ts` — addon manifest, exports the 4 button types in order [up, down, current, logo] (test asserts this exact order; will need updating to match new layout).
- `packages/cli/src/builtin-addons/internal-settings/buttons/` — per-button files: `brightness-up.tsx`, `brightness-down.tsx`, `current-brightness.tsx`, `logo-version.tsx`. Each implements its own render function.
- `packages/cli/src/builtin-addons/internal-settings/index.test.ts` — 17 lines, asserts addon shape and exact button order.

### Deck assembly
- `packages/cli/src/deck/runtime.ts` — `INTERNAL_SETTINGS_DECK` constant at lines 267-292 (static DeckConfig with hard-coded positions 0-3). To be replaced by a function call to `createInternalDecks(keyCount)`.
- `packages/cli/src/deck/create-internal-decks.ts` (or similar) — `createInternalDecks(keyCount)` exists; verify the exact file path during planning. Used elsewhere in the codebase for keyCount-aware deck assembly.

### Out of scope (do not touch)
- `packages/cli/src/builtin-addons/brightness/` — standalone user-installable `brightness` addon (cycles 0/25/50/75/100). Separate from `internal-settings`; not part of this phase.
- `packages/cli/src/builtin-addons/internal-settings/buttons/*.tsx` render functions — only their JSX internals change; their public interface (button type id, onTap behavior) is unchanged.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IconLabelSurface` (25 lines, exported from `ui/index.ts`): drop-in replacement for the hand-rolled `<Icon>` + `<Text>` pair in brightness_up/brightness_down. Default render already matches what the current code does by hand.
- `Label` primitive (exported from `ui/index.ts`): drop-in replacement for `<Text size="xl">` in current_brightness. SETTINGS-07 explicitly requires this.
- `createInternalDecks(keyCount)` (existing helper): the dynamic layout builder. Replaces the static `INTERNAL_SETTINGS_DECK` constant in `runtime.ts`.

### Established Patterns
- **Surface primitive convention:** every new surface lives under `packages/cli/src/ui/surfaces/`, accepts a single render prop, theme-overrides via `useThemeUiPresentation().surfaces[name]`. Phase 67 follows this convention by using `IconLabelSurface` (not building a new one).
- **Internal button pattern:** the 4 `internal-settings` button types are individually authored files under `buttons/`, each exporting a button definition with `id`, `render`, and `onTap`. Phase 67 only changes the `render` function internals; the file layout is unchanged.
- **Dynamic deck layout:** `createInternalDecks(keyCount)` is the established pattern for keyCount-aware decks. Phase 67 extends it (or replaces the static `INTERNAL_SETTINGS_DECK`) to position buttons at n-3/n-2/n-1 and position 0.

### Integration Points
- `packages/cli/src/deck/runtime.ts:267-292` — `INTERNAL_SETTINGS_DECK` is consumed by the deck loader. Replacing it with a `createInternalDecks(keyCount)` call must preserve the deck's `name` and `target` properties and the `system: true` flag.
- `packages/cli/src/builtin-addons/internal-settings/index.test.ts` — asserts the exact button order. New order is [logo, down, up, current] (in declaration order in the addon manifest, regardless of deck position).
- `.planning/REQUIREMENTS.md` lines 135-137 — SETTINGS-05 and SETTINGS-06 textual content must be updated to reflect the new layout (D-02).
- `.planning/ROADMAP.md` Phase 67 success criteria — update the "n-1=percent" and "n-1=version" lines to reflect position 0 = version and n-1 = percent.
</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The standalone `brightness` user-installable addon (cycles 0/25/50/75/100) was identified as out of scope; if it should be harmonized with the internal-settings brightness cluster, that's a separate decision for a future phase.
</deferred>

---
*Phase: 67-settings-deck-layout-revamp*
*Context gathered: 2026-06-15*
