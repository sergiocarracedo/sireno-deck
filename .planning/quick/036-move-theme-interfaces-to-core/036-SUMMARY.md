# Quick Task 036 Summary

**Task:** `packages/cli/src/themes/default/ButtonFrame.tsx` defined theme
presentation interfaces locally; they belong in core so the contract is shared
between built-in and 3rd-party themes. Also fix the TypeScript error on line
53 (`Object literal may only specify known properties, and 'className' does not
exist in type 'Partial<unknown> & Attributes'` from the `cloneElement` call).

**Completed:** 2026-06-05

## What was done

- Removed the four local interface declarations
  (`ButtonFrameProps`, `ThemeIconProps`, `ThemeChipProps`, `ThemeTextProps`)
  from `ButtonFrame.tsx`.
- Imported the canonical contract from `@/config/theme`:
  - `ThemeButtonFrameProps` for the `ButtonFrame` parameter type
  - `ThemeIconPresentationProps` for `ThemeIcon`
  - `ThemeChipPresentationProps` for `ThemeChip`
  - `ThemeTextPresentationProps` for `ThemeText`
- Fixed the line 53 error by binding the new props object to a typed
  `Record<string, string>` variable before passing it to `cloneElement`.
  This sidesteps TypeScript's excess-property check on the literal
  (which was failing because `ReactElement` (default `<unknown>`) plus
  `Attributes` (just `{ key? }`) does not include `className`).
- The `addThemeClass` helper signature is preserved (it takes
  `ReactElement`, the three callers stay the same). The runtime works
  because `ui/Chip.tsx`, `ui/Icon.tsx`, and `ui/Text.tsx` all wrap their
  internal child in a styled element first and then hand that element to
  the theme override — so `props.children` is always a real `ReactElement`
  (the styled span / img / div), not a raw user string.

## Runtime verification

`pnpm exec vitest run src/render/dom-host.test.tsx` → 20/20 passing,
including the `threads theme-owned Icon, Chip, and Text presentation
through the hosted-button runtime seam` regression that pins
`font-aux` / `text-sm` / `data-sireno-ui-chip="true"` on the rendered
chip, plus the data attributes and tone class added by `addThemeClass`.
`pnpm exec tsc --noEmit` no longer reports
`ButtonFrame.tsx(53,5): error TS2769`.

## Files changed

- `packages/cli/src/themes/default/ButtonFrame.tsx` — interfaces removed
  and replaced with core contract imports; `cloneElement` call typechecks.

## Commit

`1d1b359` — feat(quick-036): move default theme presentation interfaces to
core contract and fix ButtonFrame line 53
