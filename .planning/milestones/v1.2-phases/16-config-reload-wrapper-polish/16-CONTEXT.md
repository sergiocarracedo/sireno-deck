# Phase 16: Config Reload + Wrapper Polish - Context

**Gathered:** 2026-05-19
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 16 adds live config reload plus config-authored deck file references, while tightening the shared wrapper visuals. Users should be able to split deck definitions into referenced YAML files, edit either the root config or loaded deck files and see the runtime reload, keep their current navigation state when the reloaded config still supports it, and use the shared wrapper without the current theme-name footer while optionally overriding the wrapper accent with a token or raw color. The phase should stay narrow: deck references only, not a general YAML include system or broader styling DSL.

</domain>

<decisions>
## Implementation Decisions

### Deck File References
- Phase 16 should support deck references at `decks.<id>: @path/to/deck.yml`.
- A referenced deck file must contain a full ordinary deck object, including `id`, rather than a special deck-body-only shape.
- Absolute and relative paths are both allowed.
- Relative paths must resolve from the YAML file that owns the reference, not from process cwd and not always from the root config.
- Include support stays narrow in this phase: deck refs only, not generic `@file` support for arbitrary config sections.

### Reload Triggering and File Scope
- Hot-reload should watch the root config file and every deck file loaded through the deck-reference mechanism.
- Referenced deck files are first-class config inputs for reload purposes; editing them should trigger the same reload flow as editing `config.yml`.
- Planning should keep watcher scope precise to the actually loaded files rather than watching an entire config tree opportunistically.

### Invalid Reload Behavior
- If a watched config change produces an invalid config, the runtime should switch to a built-in temporary error deck rather than silently keeping the prior deck surface or stopping the daemon.
- That temporary error deck should show the latest config error summary.
- The error state should auto-recover on the next successful reload.
- The error deck should be runtime-owned in this phase, not configurable from user config, because config may itself be invalid.

### Successful Reload Continuity
- After a successful reload, preserve the full current navigation stack if every deck in that stack still exists.
- If the full stack is no longer valid but the currently active deck still exists, keep that active deck as the sole restored stack entry.
- If the active deck no longer exists either, fall back to `main_deck`.
- Successful reloads should rebuild runtime button instances from scratch rather than attempting per-button in-memory state migration.
- Config remains authoritative across reloads; internal toggle state and similar runtime-only state should reset with the rebuilt instances.

### Shared Wrapper Cleanup
- Remove the current theme-name footer from the shared wrapper entirely.
- Shared wrapper accent customization should be available as a narrow explicit per-button override, not as a broad styling system.
- The accent override should accept either theme tokens or raw color values.
- Existing explicit per-button props should remain authoritative over shared/default wrapper behavior, consistent with prior render-surface decisions.

### Agent's Discretion
- Exact syntax and parsing boundary for recognizing `@path` references as long as it stays scoped to deck values.
- Exact file-watcher implementation and debounce behavior.
- Exact shape of the built-in temporary error deck, as long as it clearly communicates the latest config error summary and auto-recovers on the next valid reload.
- Exact field name for the per-button accent override, as long as it stays narrow and explicit.
- Exact accepted raw color formats beyond the user's stated token-or-RGB intent, as long as validation is deterministic and documented.

</decisions>

<specifics>
## Specific Ideas

- The current loader already owns path-aware validation and should stay the canonical seam for deck-reference expansion rather than splitting include logic across runtime startup and schema validation.
- The current runtime already owns navigation stack restore semantics for locked-session behavior, so reload restore should reuse that same style of state preservation instead of inventing a parallel continuity mechanism.
- The built-in error deck should be the smallest honest implementation of invalid reload feedback: visible on-device, runtime-owned, and independent from potentially broken config.
- The shared wrapper cleanup should be surgical: remove the theme-name footer and add a narrow accent override without widening Phase 13's primitive system into a CSS-like layer.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/11-session-config-contracts/11-CONTEXT.md`
- `.planning/phases/13-global-wrapper-style-primitives/13-CONTEXT.md`
- `packages/cli/src/config/loader.ts`
- `packages/cli/src/config/loader.test.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/runtime.test.ts`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/render/text-image.test.ts`
- `builtin-addons/core-buttons/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/loader.ts`: already centralizes file discovery, YAML parsing, host-context interpolation, and error-path remapping; it is the natural seam for resolving deck references and tracking which files were loaded.
- `packages/cli/src/core/schemas.ts`: already enforces `main_deck` existence, `deck.id` to map-key consistency, and early config validation; referenced deck files should still flow through these same rules.
- `packages/cli/src/deck/runtime.ts`: already owns active deck state, stack restore behavior, and runtime instance lifecycle; successful reload continuity should likely connect here.
- `packages/cli/src/render/text-image.ts`: currently renders the shared/default wrapper and still includes the theme-name footer; this is the direct seam for the wrapper cleanup and accent override behavior.
- `builtin-addons/core-buttons/src/index.ts`: registers the built-in shared wrapper/style defaults and is a likely seam for any narrow built-in shared-wrapper accent contract.

### Established Patterns
- Config failures should happen early with path-aware diagnostics rather than becoming vague runtime failures later.
- Runtime continuity should preserve real user state when possible, as already established for lock/unlock navigation restore.
- Shared/default render behavior prefers narrow explicit props over a broad styling language.
- Explicit button-level fields stay authoritative even when shared wrapper/style primitives exist.

### Integration Points
- Deck references will connect YAML parsing in `packages/cli/src/config/loader.ts` with deck validation in `packages/cli/src/core/schemas.ts`.
- Hot-reload will likely connect startup orchestration and loader outputs with runtime recreation in `packages/cli/src/deck/runtime.ts`.
- Successful reload continuity will likely connect whatever reload manager is introduced with the deck controller/runtime stack restore path already used for session lock behavior.
- Invalid reload handling will likely connect loader validation errors to a runtime-owned fallback render surface rather than normal config-authored deck activation.
- Shared wrapper cleanup and accent override will connect `packages/cli/src/render/text-image.ts` with the existing bundled shared wrapper/style registration in `builtin-addons/core-buttons/src/index.ts`.

</code_context>

<deferred>
## Deferred Ideas

- Generic YAML include support outside `decks.<id>: @file`.
- Config-authored references for themes or arbitrary nested sections.
- User-configurable error decks for invalid reload states.
- Per-button runtime state migration across reloads.
- Broader styling or theme-engine expansion beyond removing the shared footer and adding a narrow accent override.

</deferred>

---
*Phase: 16-config-reload-wrapper-polish*
*Context gathered: 2026-05-19*
