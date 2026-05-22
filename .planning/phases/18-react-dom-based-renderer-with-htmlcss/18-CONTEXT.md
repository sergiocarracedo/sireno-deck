# Phase 18: React DOM-Based Renderer With HTML/CSS Surface Support - Context

**Gathered:** 2026-05-21
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Replace the current pure-SVG image renderer with a browser-backed React HTML/CSS render system for Stream Deck buttons, and remove the non-browser renderer path rather than preserving it as fallback compatibility. Buttons are authored as normal React TSX components that receive runtime context, button config, and methods. Core uses `react-dom` to render that TSX into HTML/CSS inside a persistent browser page, captures the active deck surface, crops per-key output, and feeds the existing device write path. This phase includes bounded snapshot-based media support for GIFs and video.

## Implementation Decisions

### Renderer Backend
- Use a browser-backed renderer, not DOM emulation.
- Use one persistent browser instance per daemon.
- Use one long-lived page for the active deck surface.
- Patch the active deck DOM in place instead of recreating the page on updates or deck switches.
- Treat the browser screenshot as the raster boundary, then adapt/crop into the existing per-key raw buffer pipeline.
- Browser rendering is required at startup; if the browser renderer cannot start, startup should fail honestly instead of falling back to SVG/text-image rendering.

### Media Behavior
- Support GIF and video through bounded snapshot sampling.
- Media may animate in-browser, but device output is sampled at controlled intervals rather than attempting true continuous playback semantics.

### Render Contract
- Phase 18 is a hard switch to a new DOM-authored button contract, not a compatibility shim.
- A button becomes a React component that gets runtime context, button config, and methods, then returns React TSX/React elements.
- `react-dom` owns turning TSX into browser HTML/CSS.
- Button authors use standard HTML elements plus exported core React components, not custom intrinsic tags such as `deck-button` or `deck-surface`.
- The current helper-style/custom renderer authoring API is replaced in Phase 18 rather than kept as the primary path.
- Remove the legacy custom intrinsic render contract entirely: `deck-button`, `deck-surface`, `deck-text`, and legacy fallback metadata should not survive as supported render paths.
- Core no longer standardizes visual render props like `label`, `icon`, `accent`, `background`, or `variant` as the main authoring contract.
- Those visual fields become button-owned config decisions per button type.
- `full_surface` remains a shared cross-cutting prop across button types.

### Shared Base Shape
- Rename the shared base concept from `buttonShape` / wrapper terminology to `buttonFrame`.
- `buttonFrame` must be a real React component.
- Core applies `buttonFrame` implicitly by default.
- `buttonFrame` is also exported for explicit use in advanced cases.
- `full_surface: true` opts out of the default frame and gives the button full control of the key surface.

### Runtime-Owned Surfaces
- Runtime-owned surfaces also follow the browser-backed TSX contract.
- The implicit locked-session surface must render through the browser path.
- The temporary config-error surface must render through the browser path.
- Internal emergency or system-owned surfaces must not keep the removed legacy renderer alive.

### Cleanup Boundary
- Extract shared key geometry/preset types out of `render/text-image.ts` into a browser-neutral module before deleting the old SVG renderer implementation.
- After extraction, remove `render/text-image.ts` and its tests rather than leaving a constants-only shell behind.
- Remove browserless fallback orchestration from `cli/commands/start.ts`.
- Remove legacy compatibility seams from runtime, addon API, schemas, and reconciler layers that only existed to preserve the old renderer.

### Performance Envelope
- Warm the browser/page once during daemon startup and keep them alive.
- On navigation or state updates, recapture the full active deck and then crop per-key output.
- Use one bounded capture queue with coalescing to the latest state.
- Prefer latest visible correctness over replaying every intermediate capture.

### Agent's Discretion
- Exact Playwright page structure, DOM mounting strategy, and CSS organization.
- Exact screenshot/cropping implementation details as long as they preserve the deck-page -> per-key-output contract.
- Exact refresh cadence defaults for sampled media, as long as they stay bounded and honest.

## Specific Ideas

- HTML/CSS is still the browser-facing output, but React TSX is the authoring model and `react-dom` is responsible for converting it.
- The browser should represent the full active deck surface, not one browser instance per button.
- Video-style buttons may expose only media-specific config such as `src` and `loop` rather than inheriting generic text/icon props.
- The current shared base should survive into the DOM era as a React-owned `buttonFrame`, not as hidden SVG conventions.
- If Chromium/Playwright is unavailable, fail startup with a clear renderer error instead of quietly degrading into a different rendering model.
- Cleanup should be real, not partial: no hidden internal fallback path, no legacy addon API, no leftover SVG renderer module kept around for convenience.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `packages/cli/src/render/browser-renderer.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/addon/api.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/browser-renderer.ts`: persistent browser/page lifecycle, deck capture queue, and per-key crop seam stay central after cleanup.
- `packages/cli/src/render/dom-host.tsx`: TSX-to-HTML host path and `buttonFrame` composition remain the authoring bridge into the browser page.
- `packages/cli/src/cli/commands/start.ts`: current live render/device path still owns lifecycle, reconnects, and device writes, but needs the browser-only cleanup.
- `packages/cli/src/deck/runtime.ts`: runtime-owned button lifecycle, invalidation, polling, and active-deck rendering triggers stay central, but legacy render branching should be removed.

### Established Patterns
- Runtime owns button lifecycle, navigation, invalidation, and polling; render output plugs into that rather than owning runtime state itself.
- Device writes still happen per key through the existing buffer pipeline.
- Real-device UAT matters because render-path bugs can survive unit coverage when metadata is dropped between seams.
- The repo already treats React as the authoring model for buttons; the Phase 18 correction is to let `react-dom` own DOM output instead of routing React through a custom host-description layer.
- Keeping a hidden fallback path would directly contradict the Phase 18 contract and preserve the complexity this phase is supposed to delete.

### Integration Points
- Remove `renderTextImage()` and the SVG renderer module after extracting shared preset constants needed by browser code.
- Remove the custom render contract currently expressed through `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` instead of keeping them as fallback-only compatibility.
- Keep `packages/cli/src/cli/commands/start.ts` and `packages/cli/src/deck/runtime.ts` as the main integration seam between runtime events and captured device buffers, but make them browser-only.

## Deferred Ideas

- Long-term dual support for the old `DeckButtonProps` contract and the new DOM-component contract.
- Per-button capture isolation or a separate persistent page per button.
- Best-effort continuous media playback semantics instead of bounded sampling.
- More advanced update prioritization than simple latest-state coalescing.
- Any browserless degraded mode or hidden emergency renderer path.

---
*Phase: 18-react-dom-based-renderer-with-htmlcss*
*Context gathered: 2026-05-21*
