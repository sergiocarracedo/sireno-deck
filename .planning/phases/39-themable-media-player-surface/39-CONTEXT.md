# Phase 39: Themable Media Player Surface - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

External themes must be able to override the `Surface` component used by the built-in media-player addon so they can render the button surface however they want. The built-in `Surface.tsx` stays as a fallback when no theme override is provided.
</domain>

<decisions>
## Implementation Decisions

### Registration
- Themes add `mediaPlayer: { surface: '<path>' }` to their manifest, pointing to a `.tsx` component file
- Runtime loads it as a separate module — explicit, traceable
- Manifest-driven, no auto-discovery

### Contract
- Theme override Surface receives the same props as the built-in `Surface.tsx`: `title, artist, source, progress, status, time`
- Both themed and built-in Surface must share the same prop interface
- Themes compose their own layout — they decide what to render, but must accept all six props

### Resolution Priority
- If the active theme's manifest declares `mediaPlayer.surface`, use it
- Otherwise, fall back to the built-in `Surface.tsx` (no behaviour change for non-overriding themes)
- No opt-out for theme authors — declaring `mediaPlayer.surface` means using it
- Resolution happens once at theme load time, not per render

### Agent's Discretion
- Exact manifest schema location (top-level vs nested) — agent decides what fits existing theme manifest shape
- Path resolution mechanism (theme-relative vs absolute) — agent follows existing theme asset conventions
- Error handling for invalid theme Surface (missing props, render error) — agent decides failure UX
- Whether to validate the theme Surface at theme load time (type check) or at first render
</decisions>

<specifics>
## Specific Ideas

- The current `Surface.tsx` uses `ButtonSurface` from `@/addon/api` as its root — theme overrides should follow the same pattern (theme Surface renders inside `ButtonSurface`)
- The `media-player-button.tsx` has an inline `render` function that duplicates the Surface layout (lines 174-218) — this duplication should be resolved during planning (likely by having the button render use the resolved Surface)
- `ProgressBar` and `MediaStatusIcon` are sub-components that the theme Surface may or may not use — themes compose freely
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/builtin-addons/media-player/components/Surface.tsx` — the built-in Surface (fallback target)
- `packages/cli/src/builtin-addons/media-player/media-player-button.tsx` — current render path that needs to consume the resolved Surface
- `packages/cli/src/builtin-addons/media-player/internal-types.ts` — `MediaButtonStatus` type referenced by Surface props
- `packages/cli/src/config/theme/theme.ts` — theme resolution and manifest loading
- `packages/cli/src/addon/api.ts` — `ButtonSurface` component and addon API
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Surface.tsx` (47 lines) — the built-in default Surface. Reused as-is for the fallback path
- `ButtonSurface` from `@/addon/api` — the root container all Surface variants wrap in
- Theme manifest resolution (`resolveTheme` in `config/theme/theme.ts`) — already loads theme runtime modules; can be extended to also load `mediaPlayer.surface`

### Established Patterns
- Theme manifest-driven configuration (from Phase 25/26) — themes already declare `buttonFrame` and other runtime entries through manifest
- Theme runtime loading uses `tsx` import with package-root-relative paths — same pattern applies to `mediaPlayer.surface`
- Button render function in `media-player-button.tsx` returns JSX — the resolved Surface component can be invoked inside the `render` function

### Integration Points
- `resolveTheme` in `config/theme/theme.ts` returns a Theme object — needs an optional `mediaPlayerSurface` field added
- `media-player-button.tsx` `render` function (line 174) — needs to receive and use the resolved Surface
- Theme manifest schema validation in `src/core/schemas.ts` — needs an optional `mediaPlayer.surface` field
</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---
*Phase: 39-themable-media-player-surface*
*Context gathered: 2026-06-04*
