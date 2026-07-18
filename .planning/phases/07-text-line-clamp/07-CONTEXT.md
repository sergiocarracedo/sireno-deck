# Phase 7: Text Line-Clamp & Ellipsis - Context

**Gathered:** 2026-07-18
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow the Text component to accept a `fit` prop that supports multi-line truncation via `line-clamp` with ellipsis. The `fit` prop must accept both string aliases (`"ellipsis"`) and an object form (`{ type: "line-clamp", lines: N, reserveSpace: true }`). When `reserveSpace` is true, the component must reserve vertical space for the specified number of lines even when content is empty or short.

</domain>

<decisions>
## Implementation Decisions

### Type Definition Shape
- **Decision:** Union type with string aliases
- **Definition:**
  ```typescript
  type TextFit = 
    | 'ellipsis' 
    | 'shrink' 
    | 'wrap' 
    | 'hidden' 
    | { type: 'line-clamp', lines: number, reserveSpace?: boolean }
  ```
- String aliases work alongside object config. Backward-compatible with existing `fit="ellipsis"` usage.

### CSS Implementation
- **Decision:** Tailwind `line-clamp-N` utilities
- Use Tailwind's built-in `line-clamp-1` through `line-clamp-6` classes (available since Tailwind v3.3)
- Dynamically apply the appropriate class based on the `lines` prop
- Lines > 6 fall back to `wrap` mode (or reject with validation)

### reserveSpace Behavior
- **Decision:** Min-height with line-height multiplier
- When `reserveSpace: true`, set `min-height: (lines * lineHeight)` on the container
- Uses the existing `lineHeight` prop (default: 1)
- Natural behavior that matches user expectations

### Line Count Support
- **Decision:** Tailwind classes only (1-6 lines)
- Support lines 1-6 via Tailwind utilities
- Lines > 6: fall back to `wrap` mode
- Lines < 1: clamp to 1

### Agent's Discretion
- Exact validation behavior for invalid line counts (clamp vs throw)
- Whether to add a runtime warning when lines > 6

</decisions>

<specifics>
## Specific Ideas

- `fit="ellipsis"` remains a valid alias for backward compatibility (single-line ellipsis)
- `fit={{ type: 'line-clamp', lines: 2, reserveSpace: true }}` is the primary new use case
- The ellipsis character is always "..." (not configurable for this phase)
- When `reserveSpace` is true and content is empty, the container still occupies space for `lines` lines

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/07-text-line-clamp/07-DISCOVERY.md` — Discovery report with file map and risk analysis
- `packages/cli/src/ui/primitives/Text.tsx` — Current Text component implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Text component** (`packages/cli/src/ui/primitives/Text.tsx`): Current `fit` prop supports `wrap`, `ellipsis`, `shrink`, `hidden` with CSS class mapping
- **Tailwind utilities**: Project uses Tailwind CSS; `line-clamp-N` utilities are available out-of-the-box
- **cn utility** (`packages/cli/src/ui/utils/cn.ts`): Used for conditional class composition

### Established Patterns
- **Type unions for props**: Text already uses string unions (`TextAlign`, `TextTone`, `TextSize`)
- **Theme presentation**: `useThemeUiPresentation` allows themes to override Text rendering — must pass through the resolved fit config
- **CSS class mapping**: Pattern of mapping prop values to CSS classes via lookup objects (`ALIGN_CLASS`, `TONE_CLASS`, etc.)

### Integration Points
- **Text component** (`packages/cli/src/ui/primitives/Text.tsx`): Primary modification target
- **Theme presentation** (`packages/cli/src/ui/theme-presentation.tsx`): Type definitions must align
- **Frontend mock** (`packages/cli/frontend/src/__mocks__/themes-manifest.tsx`): Mock Text may need updating if tests change

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-text-line-clamp*
*Context gathered: 2026-07-18*
