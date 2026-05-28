# Phase 1: Theme-Relative Typography Contract - Context

**Gathered:** 2026-05-28
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Phase 1 fixes the typography-size contract so shared `Text` sizing is truly relative to each active typography role base. `md` must equal the active theme base, the other `size` tokens must scale proportionally from that base, and theme UI wrappers must not become a second sizing engine. This phase also includes the contract cleanup needed to stop relying on raw typography classes as implicit final text sizing. It does not introduce new rich formatting behavior, a theme-configurable size ladder, or a broader text layout rewrite.

## Implementation Decisions

### Typography Base Ownership
- Typography role classes should publish the role base and own family, weight, and tracking.
- Typography role classes should stop assigning direct final `font-size` values.
- Final text size should be resolved by shared `Text` scaling rather than by the role classes themselves.
- Raw callers that currently depend on implicit typography-class sizing should be migrated rather than preserved through compatibility fallbacks.

### Size Scale Shape
- `md` is the exact active typography-role base size.
- `xs`, `sm`, `lg`, `xl`, and `2xl` should use one shared proportional ladder across `main`, `aux`, and `mono`.
- The ladder should use moderate steps rather than extremely conservative or bold jumps.
- The size ladder stays fixed in core for Phase 1; themes provide role bases, not custom per-size multipliers.

### Theme UI Boundary
- Core owns the meaning of `size`.
- Theme UI wrappers may observe `size` metadata but must not redefine text-size semantics.
- The default `ThemeText` wrapper should expose `size` metadata for observability/testing, but should not compute font sizing.
- Phase 1 should not leave a supported theme escape hatch for overriding size semantics.

### Raw Typography Migration
- Phase 1 should sweep raw `font-main` / `font-aux` / `font-mono` callers so the contract cut is explicit rather than partial.
- When a caller is actually rendering text content, `Text` is the preferred replacement.
- Raw typography classes may remain only where they are part of tightly owned non-`Text` markup, but they must no longer be relied on for implicit final text sizing.
- Regression coverage should make the new contract explicit so the old typography-class sizing seam does not silently return.

### Agent's Discretion
- Exact multiplier values for the moderate shared size ladder.
- Exact CSS-variable names and class structure used to publish typography-role bases and apply shared `Text` scaling.
- Exact migration order for raw typography callers, as long as the final contract sweep is real.
- Exact tests and fixtures used to prove that raw typography classes are no longer the supported implicit sizing path.

## Specific Ideas

- `packages/cli/src/ui/Text.tsx` already carries `typography` and `size`; the contract fix should deepen that seam rather than inventing a new text API.
- `packages/cli/src/render/theme-utilities.ts` is the current source of truth for typography utility classes, and it currently still stamps final `font-size` directly in `.font-main`, `.font-aux`, and `.font-mono`.
- `packages/cli/src/config/theme.ts` already passes `size` through `ThemeTextPresentationProps`, which is a good signal that themes should observe the metadata rather than own the sizing math.
- `packages/cli/src/themes/default/ButtonFrame.tsx` should expose size metadata in `ThemeText` for visibility, but should not become a second typography engine.
- Existing built-ins and UI pieces that still use raw `font-main` / `font-aux` / `font-mono` should be migrated onto `Text` for text nodes so the Phase 1 contract cut is honest.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/research/SUMMARY.md`
- `.planning/phases/12-backgrounds-text-fitting/12-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/themes/default/ButtonFrame.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/ui/Text.tsx`: already defines the shared `typography` + `size` API and carries `size` through the theme UI presentation seam.
- `packages/cli/src/render/theme-utilities.ts`: owns the current typography utility classes and is the main contract-fix seam because it still assigns direct final `font-size` values per typography role.
- `packages/cli/src/config/theme.ts`: already models `ThemeTextPresentationProps.size`, which reinforces that size metadata belongs in the core text contract.
- `packages/cli/src/themes/default/ButtonFrame.tsx`: is the current default theme text wrapper and should stay presentation-only.

### Established Patterns
- Phase 12 already locked text fitting as a narrow explicit render contract rather than a broad visual-system rewrite.
- Phase 28 already established `Text` as the canonical text component and locked theme customization to the presentation layer rather than per-theme semantic drift.
- Recent phases have preferred honest contract cuts over compatibility shims when the old behavior is known to be wrong.

### Integration Points
- Fix the typography contract in `packages/cli/src/render/theme-utilities.ts` and `packages/cli/src/ui/Text.tsx` together so role bases and shared size tokens stop fighting each other.
- Preserve theme metadata flow in `packages/cli/src/config/theme.ts` and `packages/cli/src/themes/default/ButtonFrame.tsx` without moving size semantics into themes.
- Sweep built-ins and UI call sites that still rely on raw typography classes for text sizing so the new contract is visible in real shipped surfaces.
- Add focused tests/fixtures that prove shared size behavior across `main`, `aux`, and `mono` and guard against reintroducing implicit role-class sizing.

## Deferred Ideas

- Theme-configurable size ladders.
- Theme-specific overrides of shared `Text` size semantics.
- Rich formatting or date-time parser work from later phases.
- A broader text layout or fit-mode rewrite beyond the typography contract cleanup.

---
*Phase: 01-theme-relative-typography-contract*
*Context gathered: 2026-05-28*
