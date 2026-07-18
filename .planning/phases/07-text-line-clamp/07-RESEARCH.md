---
phase: 07
area: text-line-clamp
created: 2026-07-18
sources:
  - https://tailwindcss.com/docs/line-clamp
  - https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp
---

# Research: Text Line-Clamp & Ellipsis

## Don't Hand-Roll

**Don't build your own line-clamp logic** — Tailwind v4 ships `line-clamp-<number>` utilities out-of-the-box. They use the standard CSS approach: `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N; overflow: hidden;`. [VERIFIED: tailwindcss.com/docs/line-clamp]

**Don't use inline styles for line-clamp** — The component already uses Tailwind utility classes via the `cn()` helper. Following the established pattern keeps the CSS pipeline clean and allows JIT compilation.

**Don't fork Text.tsx for the new behavior** — The existing `fitModesClasses` pattern in `Text.tsx` is exactly what we need to extend. Adding new keys to the lookup object is the minimal change.

## Common Pitfalls

1. **`-webkit-line-clamp` requires `-webkit-box` display** — The three properties must be set together: `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp: N`. Tailwind's utility handles this automatically. [VERIFIED: MDN]

2. **`overflow: hidden` is required for clipping** — Without it, the content overflows but an ellipsis still appears. Tailwind's `line-clamp-N` includes `overflow: hidden`. [VERIFIED: MDN]

3. **Lines < 1 or > 6** — Tailwind v4 provides `line-clamp-1` through `line-clamp-6` as named utilities. For values outside this range, use arbitrary value syntax `line-clamp-[N]`. We decided to limit to 1-6 (per CONTEXT.md decision). [VERIFIED: tailwindcss.com/docs/line-clamp]

4. **`reserveSpace` interaction with empty content** — When content is empty AND `reserveSpace: true`, we need `min-height` not just `-webkit-line-clamp`. The clamp only kicks in when content overflows.

5. **Theme override compatibility** — The `themeUi.primitives.text()` function receives the `fit` prop. Theme implementations that override Text must accept the new union type. This is a type-only concern; the runtime prop is passed through.

6. **TypeScript narrowing on union** — When `fit` is the object form `{ type: 'line-clamp', lines: N }`, accessing `fit.lines` requires a type guard. Extract a helper function to normalize the fit prop.

## Existing Patterns in This Codebase

- **`fitModesClasses` lookup pattern** (`packages/cli/src/ui/primitives/Text.tsx:354-359`): Object mapping fit values to CSS class strings. Pattern to extend with `line-clamp-N` classes.
- **`sireno-text-fit-shrink` CSS class** (`packages/cli/src/themes/default/components.css:79-84`): Uses `-webkit-line-clamp: 1` for single-line shrink behavior. Confirms the pattern works in this codebase.
- **`cn()` utility** (`packages/cli/src/ui/utils/cn.ts`): Joins conditional class arrays. Used throughout Text component.
- **`data-sireno-text-fit` attribute** (`Text.tsx:382`): Exposes the fit value as a data attribute for testing/CSS targeting.

## Recommended Approach

1. **Extend `TextFit` type** to include the object form:
   ```typescript
   export type TextFit = 
     | 'ellipsis' 
     | 'shrink' 
     | 'wrap' 
     | 'hidden' 
     | { type: 'line-clamp'; lines: number; reserveSpace?: boolean }
   ```

2. **Normalize fit** at the top of the Text component:
   ```typescript
   const fit = props.fit ?? 'wrap'
   const isLineClamp = typeof fit === 'object' && fit.type === 'line-clamp'
   const lines = isLineClamp ? fit.lines : 0
   const reserveSpace = isLineClamp && fit.reserveSpace === true
   ```

3. **Extend `fitModesClasses`** with dynamic line-clamp support:
   ```typescript
   const fitModesClasses = {
     wrap: 'whitespace-normal break-words',
     ellipsis: 'overflow-hidden whitespace-nowrap text-ellipsis',
     shrink: 'sireno-text-fit-shrink whitespace-normal break-words',
     hidden: 'overflow-hidden whitespace-nowrap',
   }
   // Apply dynamically: isLineClamp ? `line-clamp-${lines}` : fitModesClasses[fit]
   ```

4. **Apply `min-height` for reserveSpace**:
   ```typescript
   if (reserveSpace && isLineClamp) {
     composedStyle.minHeight = `${lines * lineHeight}em`
   }
   ```

5. **Update theme presentation** — Pass through the resolved fit object to theme implementations so they can render correctly.

## Confidence Levels

- **HIGH:** Tailwind `line-clamp-N` utilities work as expected (verified via official docs).
- **HIGH:** The existing `sireno-text-fit-shrink` pattern confirms `-webkit-line-clamp` works in this codebase.
- **MEDIUM:** The min-height approach for reserveSpace — this is a common pattern but exact behavior depends on the parent's flex/grid layout. Worth a test with empty content.
- **MEDIUM:** Backward compatibility — `fit="ellipsis"` string usage should work unchanged since the string union members are preserved.

## Open Questions

None — all decisions resolved during discuss-phase.
