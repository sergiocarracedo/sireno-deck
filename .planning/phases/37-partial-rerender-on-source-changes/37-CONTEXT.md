# Phase 37: Partial Rerender on Source Changes - Context

**Gathered:** 2026-06-03
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Config file changes trigger a full runtime reload (existing behavior). Addon source file changes (JSX/TSX/CSS) now trigger a lighter registry-diff path that re-renders only affected buttons without restarting the full runtime.
</domain>

<decisions>
## Implementation Decisions

### Change Classification
- **Config file changes** → full `reloadRuntime()` + full deck re-render (existing behavior, unchanged)
- **Addon TSX/JSX/CSS changes** → lightweight registry-diff path, targeted re-render
- **Theme source changes** → same per-button invalidate path as addon source (both route through registry-diff)
- **CSS changes** → reload stylesheet only, no button re-render unless the CSS uses variables that affect running buttons

### Per-Button Invalidation Scope
- Keep full deck re-render on `invalidate()` — do not scope to per-button writes
- Registry-diff identifies which addons changed; the runtime still re-renders the full deck
- Per-button granularity is for diffing purposes (skip unchanged addons), not per-key writes

### Addon Source Watching
- Single recursive watcher on the `addons/` directory root
- On change: rebuild addon registry, diff against running state, only re-render changed addons via full deck re-render
- No per-addon directory watchers

### Registry-Diff Path (Addon Source Changes)
- Reuse existing `reloadRuntime()` reload-in-flight / reload-queued logic
- Diff the new addon registry against the running one to determine affected buttons
- Path is lighter than full `reloadRuntime()` because: config unchanged, hardware transport untouched, runtime instance preserved
- Falls back to full `reloadRuntime()` if the diff detects structural registry changes (new/removed addons)

### Debounce Strategy
- 100ms debounce on the addon root watcher
- Catches IDE multi-file atomic writes without masking slow hardware writes

### Agent's Discretion
- Exact debounce implementation (timer-based vs. trailing-edge)
- How to detect structural vs. non-structural registry changes
- Whether to log which addons were re-rendered
</decisions>

<specifics>
## Specific Ideas

No specific references provided — standard approaches acceptable.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/cli/commands/start.ts` — existing `watchConfigFiles` and `reloadRuntime()` flow
- `packages/cli/src/deck/runtime.ts` — existing `invalidateMountedStore()`, `createButtonMethods()` invalidate path
- `packages/cli/src/addon/registry.ts` — addon registry structure for diffing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `watchConfigFiles` (start.ts:153): existing debounced watcher with `reloadInFlight`/`reloadQueued` pattern — reuse for addon watcher
- `createRuntime` (runtime.ts): existing runtime creation seam
- `invalidateMountedStore` (runtime.ts:367): existing full-deck re-render trigger

### Established Patterns
- Debounced reload with reload-in-flight guard: existing in `start.ts` — adapt for addon source watching
- Registry-based addon loading: `addon/registry.ts` — diff against this
- Hardware write dedup: existing per-key dedup in `browser-renderer.ts` and `linux-device.ts`

### Integration Points
- New watcher wires into `startDaemon()` alongside existing `watchConfigFiles`
- Registry diff runs inside `reloadRuntime` or as a pre-flight step
- `start.ts` exports `watchAddonSources` similar to `watchConfigFiles`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 37-partial-rerender-on-source-changes*
*Context gathered: 2026-06-03*