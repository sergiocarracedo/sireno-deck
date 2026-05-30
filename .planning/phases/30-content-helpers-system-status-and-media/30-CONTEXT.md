# Phase 30: Content Helpers, System Status, and Media Player Addons - Context

**Gathered:** 2026-05-30
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Add shared component-first content helpers that bundled and external addons can reuse for two bounded layouts: `Bars` and `LabelValueList`. Then use those helpers to ship a configurable built-in `system-status` addon and a built-in `media-player` button family backed by platform adapter seams for Linux, macOS, and Windows. This phase stays within helper-backed, template-driven buttons and does not expand into a generic layout DSL or an open-ended dashboard composition system.

</domain>

<decisions>
## Implementation Decisions

### Helper API Shape
- The new helper surface should ship as public React components only, not helper factories and not a config-only registry.
- `Bars` and `LabelValueList` should live on the existing component-first addon surface alongside `Text` and `Icon`.
- `LabelValueList` owns the presentation variants for 1 line, 2 lines, and 3-4 lines automatically from line count; addon authors should not choose those variants manually in the common path.
- The helper components remain mostly presentation-only: callers own value preparation and formatting.
- Numbro-based formatting belongs at the caller or built-in-addon layer, not inside the generic helper layout components.

### System Metrics Contract
- The built-in system-status addon should use one canonical core metric catalog with stable names such as CPU, memory, swap, disk I/O, frequency, load, uptime, fans, and related system values.
- Each OS adapter should return only the metrics it can honestly provide; unsupported metrics must surface as unavailable rather than guessed, aliased loosely, or faked.
- System-status buttons should be template-driven around the new helpers rather than a free-form render DSL.
- Users should configure a helper type such as bars or label-value list, then map 1-4 metrics into that template with metadata overrides such as labels, colors, units, icons, and formatter choices.
- When a metric is unsupported or temporarily unavailable, the button should keep its intended layout and render that slot in an explicit unavailable state rather than collapsing rows or failing the whole button.

### Media Player Behavior
- The media-player contract should require truthful playback status (`play`, `pause`, or `stop`) and use best-effort metadata for title, artist, app/source name, and progress.
- Missing metadata should degrade gracefully without making the whole button unusable.
- Tap stays fixed to play/pause toggle as product truth.
- Hold remains optional and configurable through the existing button action seam rather than adding a second hard-coded transport behavior.
- Long title or artist text should reuse the existing shared `Text` marquee behavior rather than inventing a media-specific overflow system.

### Config Flexibility Boundary
- Phase 30 should allow metadata-level overrides only: metric selection, labels, colors, units, icons, formatting choices, and optional actions.
- Phase 30 should not open layout internals such as arbitrary spacing, alignment, section ordering, or helper structural overrides through config.
- The built-in system-status button family should allow optional tap and hold actions on top of metric rendering.
- The built-in media-player button should keep tap reserved for play/pause and expose only the agreed optional hold action seam.

### Agent's Discretion
- Exact public component names, prop names, and nearby file layout for the new helpers, as long as they remain normal public TSX components.
- Exact canonical metric ids and grouping within the shared metric catalog, as long as the catalog stays explicit and cross-platform.
- Exact unavailable-state visuals and copy, as long as unsupported metrics remain visible and honest in-place.
- Exact adapter internals and library choices for macOS and Windows.
- Exact system-status and media-player config schema naming, as long as the override boundary above stays intact.

</decisions>

<specifics>
## Specific Ideas

- The bars helper should support 1, 2, or 3 bars, with each bar carrying a title, color, value, and max value.
- The label-value helper should support up to 4 lines, with each line carrying an icon, label, formatted value, units, and color.
- The visual target is the mockup-style card treatment from the discussion images: distinct single-line, two-line, and denser multi-line label/value layouts rather than one generic stacked template.
- The built-in system-status addon should expose custom buttons by choosing one of the helper templates and binding selected metrics plus metadata overrides.
- The built-in media-player button should show status icon, title and artist, app/source name, and a progress bar.
- Linux media control research should evaluate `playctrl` first because it was explicitly suggested in discussion, but planning should still verify the truthful adapter boundary before locking implementation.
- Because `systeminformation` is already a dependency, planning should first evaluate reuse there for system metrics before adding more metric collection libraries.
- Because `numbro` is not currently present in package dependencies, planning should treat its introduction as an explicit built-in formatting decision rather than assuming it already exists.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `.planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/ui/Icon.tsx`
- `packages/cli/src/ui/Chip.tsx`
- `packages/cli/src/builtin-addons/core-buttons/index.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx`
- `packages/cli/package.json`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts` already exposes the mounted `render(props)` contract plus definition-level runtime hooks like `onTap`, `onPress`, and `onRelease`; Phase 30 should build on that instead of inventing a second live-widget seam.
- `packages/cli/src/ui/Text.tsx` already owns the canonical `wrap`, `ellipsis`, `shrink`, and `marquee` behavior; the media-player overflow path should reuse that contract.
- `packages/cli/src/ui/Icon.tsx` and `packages/cli/src/ui/Chip.tsx` already establish the shared component-first UI surface that the new helpers should deepen.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` already demonstrates the simple runtime action seam built-ins use for command-backed tap behavior.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx` already proves `ButtonSurface` plus sampled media metadata on the browser/render path and is a relevant reference for progress/media-oriented rendering constraints.
- `packages/cli/package.json` already ships `systeminformation`, which is the obvious first dependency to evaluate for cross-platform system metrics.

### Established Patterns
- Recent phases locked a hard component-first direction for built-ins and external addons; new shared surfaces should be public TSX components, not revived helper-factory APIs.
- Runtime ownership stays in Node while buttons render through mounted React output with explicit handler props.
- Shared UI/layout surfaces should stay bounded and reusable, not widen into config-authored mini layout languages.
- Cross-platform truth matters more than visual cleanliness: unsupported capabilities should degrade honestly rather than being hidden or fabricated.

### Integration Points
- Add the helper components onto the public addon/UI surface next to the existing shared UI kit.
- Register new built-in addon definitions under `packages/cli/src/builtin-addons/` using the same bundled-addon path as existing built-ins.
- Add one system-metrics adapter seam shared by the system-status built-ins, with Linux, macOS, and Windows implementations behind it.
- Add one media-controller adapter seam shared by the media-player built-in, with Linux, macOS, and Windows implementations behind it.
- Extend config schemas and built-in addon manifests so helper-template-driven system-status buttons and the media-player button can be configured from YAML without widening into a generic layout DSL.

</code_context>

<deferred>
## Deferred Ideas

- A generic config-authored layout DSL for arbitrary metric dashboards.
- Helper-level structural overrides for spacing, alignment, ordering, or custom variant forcing.
- Extra hard-coded media transport behaviors beyond play/pause tap plus optional hold action.

</deferred>

---
*Phase: 30-content-helpers-system-status-and-media*
*Context gathered: 2026-05-30*
