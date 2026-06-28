# Phase 15: Theme Base UI — Discussion Log

**Date:** 2026-06-28
**Mode:** standard
**Audience:** Human only (not read by downstream agents)

---

## Gray Areas Discussed

### Architecture — Where does the base live?

**Options considered:**
1. `packages/cli/src/ui/` — mirrors legacy structure, themes import from `@/ui/`
2. `packages/cli/src/themes/default/` stays as base — current structure, light already re-exports
3. `packages/cli/src/ui-base/` — explicit base directory name

**Chosen:** `packages/cli/src/ui/` (option 1)

**Rationale:** Mirrors the legacy `sireno-deck` path exactly. Clean separation — it's a library, not a theme.

---

### Override mechanism

**Options considered:**
1. Same as legacy — `ThemeUiPresentation` object with optional render functions, React context + `useThemeUiPresentation()` hook
2. Simple function overrides in index.tsx (no context)
3. Theme extends base via imports only (no runtime dispatch)

**Chosen:** Same as legacy (option 1)

**Rationale:** User said "check legacy code, the addons imports ui component from the core, and it check if the theme overrides a component if not returns the base one." Proven pattern, well-understood.

---

### What exactly is the base?

**Options considered:**
1. Use our Phase 13 code as base — already works, has tests
2. Re-port from legacy `src/ui/` — canonical reference for behavior
3. Merge both — start with ours, add missing legacy features

**Chosen:** Re-port from legacy `src/ui/` (option 2)

**Rationale:** Legacy is the canonical reference. Guarantees exact behavior for rich text parser, icon resolution, surface layout, and the theme-presentation dispatch.

---

### Theme manifest changes

**Options considered:**
1. `ThemeUiPresentation` object (legacy pattern) — themes export optional `ui` with render functions per component/surface
2. Simple function overrides by name
3. No manifest change — purely import-based overrides

**Chosen:** `ThemeUiPresentation` object (option 1)

**Rationale:** User explicitly chose the legacy approach. Themes export a `ui: ThemeUiPresentation` with optional overrides. Each base component checks for theme override at render time.

---

## Agent's Discretion Areas

- Whether to keep our Phase 13 `Text.tsx` improvements (like the `dim` tag) when re-porting from legacy. Decision: merge — keep our additions.
- Whether to adapt legacy's `cn` utility or keep plain Tailwind classes. Provide a minimal `cn` if needed.
- Whether `MainLabelSurface` from legacy should be included. Deferred unless needed during re-porting.

---

## Deferred Ideas

- `MainLabelSurface` — deferred from Phase 13. Include only if needed.
- `cn` utility from legacy — provide a minimal version if conditional classes are needed.

---

*Phase: 15-theme-base-ui*
*Discussion recorded: 2026-06-28*
