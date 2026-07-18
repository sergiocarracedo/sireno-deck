---
phase: 7
area: Text Line-Clamp & Ellipsis
created: 2026-07-18
---

# Discovery: Text Line-Clamp & Ellipsis

## Relevant Files

| File | Role | Lines |
|------|------|-------|
| `packages/cli/src/ui/primitives/Text.tsx` | Core Text component with fit modes | 391 |
| `packages/cli/src/ui/primitives/index.ts` | Exports Text and other primitives | 6 |
| `packages/cli/src/ui/theme-presentation.tsx` | Theme UI presentation interface | 58 |
| `packages/cli/frontend/src/__mocks__/themes-manifest.tsx` | Mock Text component for tests | 78 |
| `packages/cli/frontend/src/components/Deck.tsx` | Deck component using Text indirectly | 299 |

## Dependency Map

```
Text component
  ← used by: Chip.tsx, weather/pages.tsx, media/MediaSurface.tsx, 
              value-display/frontend.tsx, brightness/frontend.tsx
  → uses: useThemeUiPresentation, cn utility
  ↔ shares state with: theme presentation context
```

## Integration Points

- **Entry point:** `TextProps` interface in `packages/cli/src/ui/primitives/Text.tsx`
- **Shared state:** Theme UI presentation context (`useThemeUiPresentation`)
- **External dependencies:** None
- **Configuration:** `fit` prop currently accepts `'ellipsis' | 'shrink' | 'wrap' | 'hidden'`

## Current `fit` Prop Implementation

The `fit` prop currently supports 4 string values:
- `'wrap'` (default): `whitespace-normal break-words`
- `'ellipsis'`: `overflow-hidden whitespace-nowrap text-ellipsis`
- `'shrink'`: `sireno-text-fit-shrink whitespace-normal break-words`
- `'hidden'`: `overflow-hidden whitespace-nowrap`

## Risks

### High
- **TypeScript type union change:** Changing `TextFit` from a string union to a string | object union requires updating all existing usage sites. However, the change is backward-compatible since `fit="ellipsis"` still works.

### Medium
- **CSS implementation for line-clamp:** Need to implement multi-line truncation with `line-clamp` CSS property (or `-webkit-line-clamp`). This is well-supported in modern browsers but may need vendor prefixes.
- **`reserveSpace` behavior:** When `reserveSpace: true` and content is empty, the component should still render with the specified line height. This requires conditional min-height styling.

### Low / Acceptable
- **Theme override compatibility:** The `themeUi.primitives.text` function receives the `fit` prop, so theme implementations may need updating to handle the new object form.

## Test Coverage

**Current test coverage:** No dedicated tests found for the Text component in `packages/cli/src/ui/__tests__/`.

**Usage in tests:** Text is mocked in `packages/cli/frontend/src/__mocks__/themes-manifest.tsx` with a simple `<span>{children}</span>`.

**Risk:** Changes to the Text component won't be caught by existing tests. We should add tests for the new line-clamp functionality.

## Recommendations

Before planning Phase 7:
1. **Add tests first:** Create `packages/cli/src/ui/__tests__/text.test.tsx` to test the existing `fit` prop behavior before extending it.
2. **CSS approach:** Use `line-clamp-N` Tailwind utility classes (available in Tailwind CSS v3.3+) for multi-line truncation. This avoids custom CSS.
3. **Type definition:** Update `TextFit` to accept both string and object forms:
   ```typescript
   type TextFitConfig = 
     | 'ellipsis' 
     | 'shrink' 
     | 'wrap' 
     | 'hidden' 
     | { type: 'line-clamp'; lines: number; reserveSpace?: boolean }
   ```
4. **Backward compatibility:** Ensure `fit="ellipsis"` still works as before (alias for `{ type: 'ellipsis' }` if needed).
5. **Theme update:** Consider updating `ThemeUiPresentation` to pass the resolved fit config to theme implementations.
