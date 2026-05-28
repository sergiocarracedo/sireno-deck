# Plan 01-01 Summary

**Completed:** 2026-05-28

## What was built
Phase 1's first slice fixed the shared typography contract at the source. Typography role classes now publish the active role base instead of stamping the final font size directly, the shared `Text` size tokens scale from that active base with `md` as the exact base, and the default theme text wrapper exposes explicit size metadata without taking over sizing behavior.

## Key files
- `packages/cli/src/render/theme-utilities.ts`: moved final size resolution onto the shared `text-*` tokens, introduced one fixed moderate multiplier ladder, and kept role classes focused on family, weight, tracking, and active-base publication.
- `packages/cli/src/ui/Text.tsx`: kept the public API stable while making the rendered node expose `data-sireno-text-size` for explicit runtime observability.
- `packages/cli/src/themes/default/ButtonFrame.tsx`: added `size` to the default theme text wrapper contract and surfaced `data-sireno-default-text-size` without computing size semantics in theme code.
- `packages/cli/src/render/dom-host.test.tsx`: rewrote focused browser/runtime assertions onto the truthful role-base-plus-size-token contract and default-theme size metadata seam.

## Decisions made
- Kept the size ladder fixed in core with moderate steps instead of adding theme-configurable multipliers.
- Preserved the locked Phase 1 boundary that themes observe `size` metadata but do not own size semantics.
- Left shrink-fit untouched because it belongs to Phase 2, not the typography-base contract cut.

## Deviations
- The plan's original verify command still includes `src/cli/commands/start.test.ts`, but that file continues to fail on a pre-existing Phase 23 sample-config drift (`Unknown key 'variant'`) unrelated to the Phase 1 typography contract. The Wave 1 deliverable was verified through the focused DOM-host/browser seam the plan actually changed.

## Notes for downstream
- Any later typography work should compose through the active role base published by `.font-main`, `.font-aux`, and `.font-mono` rather than reintroducing direct final `font-size` ownership there.
- Phase 2 can now build shrink-fit behavior on top of a truthful shared size contract instead of compensating for conflicting font-size sources.
