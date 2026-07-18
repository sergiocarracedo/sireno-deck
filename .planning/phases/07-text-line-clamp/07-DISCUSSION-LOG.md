# Phase 7: Text Line-Clamp & Ellipsis - Discussion Log

**Date:** 2026-07-18
**Mode:** deep
**Phase:** 07-text-line-clamp

## Gray Areas Discussed

### 1. Type Definition Shape
**Options considered:**
- Union type with string aliases *(selected)* — `TextFit = 'ellipsis' | 'shrink' | 'wrap' | 'hidden' | { type: 'line-clamp', lines: number, reserveSpace?: boolean }`
- Discriminated union with aliases — All values as `{ type: 'ellipsis' }` etc.
- Separate FitConfig type — Keep string union, add separate object type

**User choice:** Union type with string aliases (Recommended)
**Rationale:** Simple, backward-compatible, idiomatic for the existing string-based fit prop.

### 2. CSS Implementation
**Options considered:**
- Tailwind line-clamp utilities *(selected)* — Use `line-clamp-1` through `line-clamp-6`
- Custom CSS with `-webkit-line-clamp` — Define custom CSS class
- Inline style with `-webkit-line-clamp` — Apply via inline style

**User choice:** Tailwind line-clamp utilities (Recommended)
**Rationale:** Consistent with existing Tailwind usage in Text component; no custom CSS needed.

### 3. reserveSpace Behavior
**Options considered:**
- Min-height with line-height multiplier *(selected)* — `min-height: (lines * lineHeight)`
- Fixed pixel height per line — `lines * 1.2em`
- Add separate height prop — Explicit control via new prop

**User choice:** Min-height with line-height multiplier (Recommended)
**Rationale:** Natural behavior that reuses existing `lineHeight` prop; matches user expectations.

### 4. Line Count Support (follow-up)
**Options considered:**
- Tailwind classes only (1-6) *(selected)* — Use built-in utilities, fall back for > 6
- Arbitrary values via inline style — `[line-clamp:N]` syntax
- Both: classes for 1-6, arbitrary for higher — Maximum flexibility

**User choice:** Tailwind classes only (1-6) (Recommended)
**Rationale:** Simpler, consistent with Tailwind defaults, avoids inline styles.

## Agent's Discretion

- Exact validation behavior for invalid line counts (clamp vs throw) — agent decides
- Runtime warning when lines > 6 — agent decides

## Deferred Ideas

None — all discussion stayed within phase scope.
