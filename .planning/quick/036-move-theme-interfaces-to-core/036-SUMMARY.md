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
  This sidesteps TypeScript's excess-property check on the literal (which
  was failing because `ReactElement` (default `<unknown>`) plus
  `Attributes` (just `{ key? }`) does not include `className`).
- Added narrow casts at the `ThemeChip` call site to bridge the small
  contract gap between the local original (where `children: ReactElement`
  and `tone` were required) and the core contract (where
  `children: ReactNode` and `tone` are optional through `ChipProps`). The
  casts are documented by the runtime reality: `Chip` always renders a
  single React element and always carries a tone.

## Files changed

- `packages/cli/src/themes/default/ButtonFrame.tsx` — interfaces removed
  and replaced with core contract imports; `cloneElement` call typechecks.

## Commit

`1d1b359` — feat(quick-036): move default theme presentation interfaces to
core contract and fix ButtonFrame line 53
