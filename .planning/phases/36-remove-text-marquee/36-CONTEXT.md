# Phase 36: Remove Text Marquee - Context

**Gathered:** 2026-06-03
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Strip the `marquee` text overflow mode from the `TextFit` contract, remove its CSS animation, and migrate consumers to `ellipsis`. The marquee animation forces hardware resampling at ~250ms on every CSS frame, which is too expensive after Phase 35's live hardware resampling.

</domain>

<decisions>
## Implementation Decisions

### Theme Frame Contract
- **Remove `'marquee'` from `ThemeTextProps.fit` in `ButtonFrame.tsx`** — narrow to `'ellipsis' | 'shrink' | 'wrap'`. No external themes exist, and `'marquee'` can never arrive through the pipe after `TextFit` drops it. Keeping it in the type would be misleading dead code.

### Agent's Discretion
- Media-player migration: replace `<Text fit="marquee">` with `<Text fit="ellipsis">` for title and artist overflow.
- CSS cleanup: remove the `.sireno-text-fit-marquee`, `.sireno-marquee-track`, and `@keyframes sireno-marquee-scroll` rules from `theme-utilities.ts`.
- Test cleanup: replace marquee assertions in `dom-host.test.tsx` with equivalent ellipsis assertions; update the `fit: 'marquee'` fixture in `theme.test.ts`.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Files Touched
| File | What changes |
|------|-------------|
| `packages/cli/src/ui/Text.tsx` | Remove `'marquee'` from `TextFit` union, `fitModesClasses` map, and the `<span className="sireno-marquee-track">` branch |
| `packages/cli/src/render/theme-utilities.ts` | Remove 3 marquee CSS rules (2 classes + 1 keyframes) |
| `packages/cli/src/themes/default/ButtonFrame.tsx` | Narrow `ThemeTextProps.fit` to `'ellipsis' \| 'shrink' \| 'wrap'` |
| `packages/cli/src/builtin-addons/media-player/media-player-button.tsx` | Replace 2 `fit="marquee"` with `fit="ellipsis"` |
| `packages/cli/src/render/dom-host.test.tsx` | Replace marquee assertions with ellipsis equivalents |
| `packages/cli/src/config/theme/theme.test.ts` | Replace `fit: 'marquee'` fixture |
| `packages/cli/src/builtin-addons/media-player/index.test.ts` | Replace marquee assertions with ellipsis equivalents |

### Established Patterns
- `TextFit` is a discriminated union used across the component, theme wrapper, and test fixtures — must stay consistent.
- Media-player overflow uses marquee for long title/artist strings — `ellipsis` is the simplest drop-in replacement.

### Integration Points
- Theme resolution pipes through `useThemeUiPresentation()` in `Text.tsx` — removing fit options from the component automatically removes them from the theme wrapper's effective input.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 36-remove-text-marquee*
*Context gathered: 2026-06-03*
