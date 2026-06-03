# Plan 36-01 Summary

**Completed:** 2026-06-03

## What was built

Stripped `'marquee'` from the core Text surface: the `TextFit` union type, the `fitModesClasses` CSS map, and the conditional `<span className="sireno-marquee-track">` render branch in `Text.tsx`; the three CSS rules (`.sireno-text-fit-marquee`, `.sireno-marquee-track`, `@keyframes sireno-marquee-scroll`) in `theme-utilities.ts`; and the mirror type member in `ThemeTextProps.fit` in `ButtonFrame.tsx`.

## Key files
- `packages/cli/src/ui/Text.tsx` — TextFit narrowed, class map entry removed, conditional marquee span removed
- `packages/cli/src/render/theme-utilities.ts` — 3 marquee CSS rules removed
- `packages/cli/src/themes/default/ButtonFrame.tsx` — ThemeTextProps.fit narrowed

## Decisions made
- The marquee option is fully removed from the type system — no deprecation period or compatibility shim.

## Notes for downstream
- Consumers (media-player, tests) will have compile errors — Plan 36-02 fixes them.
