# Phase 18: React DOM-Based Renderer With HTML/CSS Surface Support - Context

**Gathered:** 2026-05-21
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Replace the current pure-SVG image renderer with a browser-backed React HTML/CSS render system for Stream Deck buttons. Buttons become React components that receive runtime context, button config, and methods, then return HTML/CSS. The renderer captures the active deck surface from a persistent browser page, crops per-key output, and feeds the existing device write path. This phase includes bounded snapshot-based media support for GIFs and video.

## Implementation Decisions

### Renderer Backend
- Use a browser-backed renderer, not DOM emulation.
- Use one persistent browser instance per daemon.
- Use one long-lived page for the active deck surface.
- Patch the active deck DOM in place instead of recreating the page on updates or deck switches.
- Treat the browser screenshot as the raster boundary, then adapt/crop into the existing per-key raw buffer pipeline.

### Media Behavior
- Support GIF and video through bounded snapshot sampling.
- Media may animate in-browser, but device output is sampled at controlled intervals rather than attempting true continuous playback semantics.

### Render Contract
- Phase 18 is a hard switch to a new DOM-authored button contract, not a compatibility shim.
- A button becomes a React component that gets runtime context, button config, and methods, then returns HTML/CSS.
- Core no longer standardizes visual render props like `label`, `icon`, `accent`, `background`, or `variant` as the main authoring contract.
- Those visual fields become button-owned config decisions per button type.
- `full_surface` remains a shared cross-cutting prop across button types.

### Shared Base Shape
- Rename the shared base concept from `buttonShape` / wrapper terminology to `buttonFrame`.
- `buttonFrame` must be a real React component.
- Core applies `buttonFrame` implicitly by default.
- `buttonFrame` is also exported for explicit use in advanced cases.
- `full_surface: true` opts out of the default frame and gives the button full control of the key surface.

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

- The browser should represent the full active deck surface, not one browser instance per button.
- Video-style buttons may expose only media-specific config such as `src` and `loop` rather than inheriting generic text/icon props.
- The current shared base should survive into the DOM era as a React-owned `buttonFrame`, not as hidden SVG conventions.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/deck/runtime.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/reconciler.ts`: existing React reconciler seam that currently turns render elements into `DeckButtonProps` descriptions.
- `packages/cli/src/cli/commands/start.ts`: current live render/device path, including per-key writes and reconnect behavior.
- `packages/cli/src/deck/runtime.ts`: runtime-owned button lifecycle, invalidation, polling, and active-deck rendering triggers.

### Established Patterns
- Runtime owns button lifecycle, navigation, invalidation, and polling; render output plugs into that rather than owning runtime state itself.
- Device writes still happen per key through the existing buffer pipeline.
- Real-device UAT matters because render-path bugs can survive unit coverage when metadata is dropped between seams.

### Integration Points
- Replace or supersede `renderTextImage()` in `packages/cli/src/render/text-image.ts` with a browser-backed capture path.
- Rework the render contract currently expressed through `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts`.
- Keep `packages/cli/src/cli/commands/start.ts` and `packages/cli/src/deck/runtime.ts` as the main integration seam between runtime events and captured device buffers.

## Deferred Ideas

- Long-term dual support for the old `DeckButtonProps` contract and the new DOM-component contract.
- Per-button capture isolation or a separate persistent page per button.
- Best-effort continuous media playback semantics instead of bounded sampling.
- More advanced update prioritization than simple latest-state coalescing.

---
*Phase: 18-react-dom-based-renderer-with-htmlcss*
*Context gathered: 2026-05-21*
