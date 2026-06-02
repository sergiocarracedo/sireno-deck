# Plan 33-02 Summary

**Completed:** 2026-06-02

## What was built
Plan 33-02 completed the shipped-browser hard cut onto the real Tailwind utility seam. Shared UI no longer carries the stale fallback token or inline aux-typography debt that survived the handwritten utility era, and the remaining built-in browser surfaces now express fixed layout spacing, radius, and padding through canonical Tailwind classes while leaving genuinely runtime-driven colors, gradients, and computed layout values inline.

## Key files
- `packages/cli/src/ui/Bars.tsx`: switches the omitted-color fallback to the authoritative `--sireno-color-primary` token.
- `packages/cli/src/ui/Chip.tsx`: replaces inline aux typography styles with canonical `font-aux text-sm` utility classes.
- `packages/cli/src/ui/Bars.test.tsx`: adds focused proof that omitted bar colors fall back to `var(--sireno-color-primary)` instead of the stale `--color-primary` token.
- `packages/cli/src/render/dom-host.test.tsx`: updates shared presentation assertions so `Chip` is pinned through Tailwind typography classes rather than inline aux font styles.
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`: moves fixed radius, padding, gap, and border shell layout to Tailwind classes while keeping the `color-mix(...)` border color inline.
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`: moves the fixed label stack gap to `gap-1`.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx`: moves the fixed overlay padding to Tailwind spacing classes.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: adds focused regression proof for the analog-clock and calendar-sheet layout cut.
- `packages/cli/src/builtin-addons/core-buttons/index.test.ts`: adds focused regression proof for the media-sample overlay spacing cut.

## Decisions made
- Kept Wave 2 narrow: only changed shared/built-in seams that still carried stale token fallbacks or fixed inline layout/typography values that should now live in the Tailwind utility contract.
- Left genuinely runtime-driven inline styles in place, including arbitrary caller-provided colors, `Bars` fill colors, media gradients, and computed grid-template values.
- Treated theme wrapper marker classes such as `sireno-default-*` and Sireno runtime helpers such as `sireno-rich-text-*` and `sireno-text-fit-*` as intentional product seams, not Tailwind debt.

## Deviations
- The plan's broad verify command (`vitest run src/render/dom-host.test.tsx src/config/theme.test.ts`) was not the most truthful proof surface for the concrete Wave 2 cuts that landed. Verification was kept focused on the exact changed seams: `Bars.test.tsx`, the hosted-button shared presentation test in `dom-host.test.tsx`, the analog/calendar render tests in `date-time/index.test.ts`, and the media-sample render test in `core-buttons/index.test.ts`.
- The broader `date-time/index.test.ts` file still contains unrelated pre-existing failures outside this task (`time` button list drift and a formatter helper returning an empty string), so Wave 2 verification used the exact analog/calendar tests touched by the layout cut.

## Notes for downstream
- Wave 3 can now wire theme/addon scanning and safelisting on top of a shipped browser UI surface that is already Tailwind-truthful for shared primitives and the built-ins touched in this phase.
- If later Wave 2 cleanup expands further across built-ins, keep the same rule: only migrate fixed generic layout/typography values into Tailwind classes and leave genuinely runtime-calculated values inline.
