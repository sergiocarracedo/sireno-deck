# Quick Task 036 Plan: Move theme presentation interfaces to core + fix ButtonFrame line 53

**Task:** `packages/cli/src/themes/default/ButtonFrame.tsx` redeclares the theme
presentation interfaces (`ButtonFrameProps`, `ThemeIconProps`, `ThemeChipProps`,
`ThemeTextProps`) locally. The core contract for built-in and 3rd-party themes
already lives in `packages/cli/src/config/theme/schemas.ts`
(`ThemeButtonFrameProps`, `ThemeIconPresentationProps`,
`ThemeChipPresentationProps`, `ThemeTextPresentationProps`). The default theme
must import the core contract instead of duplicating it, and the TypeScript
error on line 53 (`Object literal may only specify known properties, and
'className' does not exist in type 'Partial<unknown> & Attributes'` in the
`cloneElement` call) must be fixed.

## Findings

- `src/config/theme/schemas.ts:74-103` already defines the canonical theme
  presentation contract: `ThemeButtonFrameProps` (requires `children` + `state`),
  `ThemeIconPresentationProps`, `ThemeChipPresentationProps` (alias of
  `ChipProps`), `ThemeTextPresentationProps`. The local `ButtonFrame.tsx`
  re-declares equivalents with different names and a weaker `ButtonFrameProps`
  (no `state`).
- `src/render/dom-host-button.tsx:42` already calls the frame with
  `{ state: button.frame_state ?? 'idle' }`, and
  `src/config/theme/theme.test.ts:80` asserts
  `theme.buttonFrame({ children: null, state: 'idle' })`. The core contract
  is the truth — the local interfaces are drift.
- The line 53 error comes from `cloneElement(element, {...})` where `element`
  is `ReactElement` (untyped props default to `unknown`), so the new props
  must be `Partial<unknown> & Attributes` and `className` is not assignable.
  Fix: type the `element` parameter as
  `ReactElement<{ className?: string }>` so `className` becomes a known
  partial property of the cloned element.

## Task 1 — Switch default theme to core contract and fix line 53

**<files>**
- `packages/cli/src/themes/default/ButtonFrame.tsx` (modify)

**<action>**
1. Remove the four local interface declarations
   (`ButtonFrameProps`, `ThemeIconProps`, `ThemeChipProps`, `ThemeTextProps`).
2. Import the core types from `@/config/theme`:
   - `ThemeButtonFrameProps` → use as the parameter type of `ButtonFrame`.
   - `ThemeIconPresentationProps` → use as the parameter type of `ThemeIcon`.
   - `ThemeChipPresentationProps` → use as the parameter type of `ThemeChip`.
   - `ThemeTextPresentationProps` → use as the parameter type of `ThemeText`.
3. In `addThemeClass`, type the `element` parameter as
   `ReactElement<{ className?: string }>` (keeping the existing
   `currentProps.className` cast and `cn(...)` call) so the
   `cloneElement(element, { className: ... })` call on line 53 typechecks.
4. Keep all data-attribute names, class names, and the `ButtonFrame` JSX
   output unchanged. Just rename the parameter types and add the `state`
   prop to the `ButtonFrame` signature (it can be accepted-but-unused for
   now; the core contract requires it).

**<verify>**
- `cd packages/cli && pnpm exec tsc --noEmit` no longer reports the
  `ButtonFrame.tsx(53,5): error TS2769` line.
- `cd packages/cli && pnpm exec tsc --noEmit` no longer reports the
  pre-existing ButtonFrame-related errors (the `Cannot use JSX unless the
  '--jsx' flag is provided` error from isolated-file tsc is expected and
  unrelated — it goes away with project-context tsc).
- The existing theme tests
  (`pnpm exec vitest run src/config/theme/theme.test.ts`) still pass
  because the `theme.buttonFrame({ children, state: 'idle' })` call site
  already aligns with the core contract.

**<done>**
- `packages/cli/src/themes/default/ButtonFrame.tsx` no longer redeclares
  presentation interfaces — it imports them from `@/config/theme` (the core
  contract used by built-in and 3rd-party themes alike).
- The `cloneElement` call typechecks.
- The default theme's `buttonFrame` and `ui.{chip,icon,text}` exports still
  satisfy `ThemeButtonFrame` / `ThemeUiPresentation` from the core contract.

## Out of scope

- Pre-existing TypeScript errors elsewhere in the repo (loader.ts,
  builtin-addons, runtime.test.ts) — they are unrelated to this task and
  were already failing on `main` before this change.
- Wiring `state` into the visual output of the default `ButtonFrame`. The
  task is to honor the core contract, not to redesign the frame visuals.
- Renaming the function exports `ThemeIcon` / `ThemeChip` / `ThemeText` —
  the re-exports in `src/themes/default/index.ts` and the
  `theme.test.ts:81-87` consumer keep working because they only import the
  resulting `ThemeUiPresentation` map.
