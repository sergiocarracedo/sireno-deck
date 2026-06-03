# Phase 18: React DOM-Based Renderer With HTML/CSS Surface Support — Research

**Researched:** 2026-05-21
**Phase goal:** Replace the current pure-SVG render system with a React HTML/CSS DOM-based renderer that can support any surface HTML can express, including richer media such as GIFs and video.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| Browser-faithful HTML/CSS rendering | Use Playwright-driven Chromium screenshots instead of DOM emulation or a custom HTML/CSS rasterizer | Playwright officially supports page screenshots to files or buffers plus element screenshots, which matches the chosen deck-page -> cropped-key pipeline better than inventing a renderer. [CITED: https://playwright.dev/docs/screenshots] | [CITED: https://playwright.dev/docs/screenshots] |
| Persistent active surface lifecycle | Keep one long-lived browser context/page and patch deck DOM in place | Playwright pages are first-class long-lived objects inside a browser context, and one context can host multiple pages if needed later. This matches the user decision to keep one persistent active-deck page warm instead of recreating it per render. [CITED: https://playwright.dev/docs/pages] | [CITED: https://playwright.dev/docs/pages] |
| Screenshot-based verification | Use Playwright visual snapshot tooling only for test verification, not as the production render contract | Playwright's snapshot docs explicitly warn that rendering differs by browser, platform, fonts, and environment, so golden testing is useful but must be controlled tightly. That argues for a pinned Chromium-backed runtime and environment-aware test strategy, not a hand-rolled diff layer. [CITED: https://playwright.dev/docs/test-snapshots] | [CITED: https://playwright.dev/docs/test-snapshots] |
| Page bootstrapping / host bridge | Use Playwright page APIs like `setContent`, `addInitScript`, `addStyleTag`, and `exposeFunction` / `exposeBinding` instead of building a bespoke IPC/render shell first | Official page APIs already cover page bootstrapping, injected scripts/styles, and host-to-page function bridges. This is enough to stand up a renderer host without inventing a parallel browser integration layer. [CITED: https://playwright.dev/docs/api/class-page] | [CITED: https://playwright.dev/docs/api/class-page] |

## Common Pitfalls

### Environment-sensitive screenshots
**What goes wrong:** Rendered pixels drift between machines, OSes, fonts, or browser modes, causing flaky tests and hard-to-reproduce rendering differences. [CITED: https://playwright.dev/docs/test-snapshots]
**Why:** Playwright documents that screenshots differ across browsers, platforms, fonts, host settings, and other environmental factors. [CITED: https://playwright.dev/docs/test-snapshots]
**How to avoid:** Pin the production runtime to one browser engine (Chromium), keep the screenshot boundary inside that browser, and run visual verification in a controlled environment with explicit font/assets setup. [CITED: https://playwright.dev/docs/test-snapshots] [ASSUMED]

### Accidentally broadening the phase into a full styling platform
**What goes wrong:** A renderer migration turns into a new design system, CSS DSL, and compatibility matrix all at once, delaying delivery. [ASSUMED]
**Why:** The current codebase already has strong pressure toward narrow explicit contracts rather than generalized styling systems, and the requirements explicitly mark a full CSS-like styling system as out of scope for v1.2. [VERIFIED: codebase scan of .planning/REQUIREMENTS.md]
**How to avoid:** Plan Phase 18 around the hard contract switch to DOM-authored button components plus the shared `buttonFrame`, but keep authoring contracts narrow and avoid adding a general styling language. [VERIFIED: codebase scan of 18-CONTEXT.md and .planning/REQUIREMENTS.md]

### Losing runtime guarantees during the contract switch
**What goes wrong:** The renderer becomes browser-capable, but existing runtime guarantees around invalidation, navigation, polling, and per-key writes become inconsistent or are reimplemented twice. [VERIFIED: codebase scan of packages/cli/src/deck/runtime.ts and packages/cli/src/cli/commands/start.ts]
**Why:** Today the runtime owns button lifecycle and emits per-key render updates, while `start.ts` owns device writes. A hard switch that bypasses those seams would duplicate responsibility. [VERIFIED: codebase scan of packages/cli/src/deck/runtime.ts and packages/cli/src/cli/commands/start.ts]
**How to avoid:** Keep runtime lifecycle ownership in `runtime.ts`, keep the device write seam in `start.ts`, and replace the image-render backend plus authoring contract rather than rebuilding the daemon around the browser. [VERIFIED: codebase scan of packages/cli/src/deck/runtime.ts, packages/cli/src/cli/commands/start.ts, and 18-CONTEXT.md]

### Unbounded media and capture backlog
**What goes wrong:** GIF/video-enabled buttons create more capture work than the daemon can process, causing stale visuals, runaway CPU, or lagging queues. [ASSUMED]
**Why:** The chosen design uses browser screenshots as the raster boundary, and full-deck recapture is more expensive than the current SVG->sharp path. The user already decided to coalesce to latest state instead of replaying everything. [VERIFIED: codebase scan of 18-CONTEXT.md and packages/cli/src/render/text-image.ts]
**How to avoid:** Plan bounded snapshot sampling, one active capture queue, and explicit coalescing semantics as first-class behavior rather than an optimization left for later. [VERIFIED: codebase scan of 18-CONTEXT.md]

### Hidden migration debt in the old render contract
**What goes wrong:** Planning assumes the old `DeckButtonProps` seam can be preserved, but the user has already rejected that and wants button-owned HTML/CSS output instead. [VERIFIED: codebase scan of 18-CONTEXT.md]
**Why:** The existing system still centers on `DeckButtonProps`, wrapper/style primitive ids, and SVG-oriented render fields such as `label`, `icon`, `variant`, and `fit`. [VERIFIED: codebase scan of packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/cli/commands/start.ts]
**How to avoid:** Treat Phase 18 as a true render-contract rewrite: button components return HTML/CSS, the shared base becomes a React `buttonFrame`, and only cross-cutting fields like `full_surface` stay core-owned. [VERIFIED: codebase scan of 18-CONTEXT.md]

## Existing Patterns in This Codebase

- **Runtime-owned button lifecycle:** `packages/cli/src/deck/runtime.ts` owns button invalidation, polling refresh, navigation, and render triggering. This should stay the orchestration seam instead of moving lifecycle into the browser host. [VERIFIED: codebase scan of packages/cli/src/deck/runtime.ts]
- **Per-key device write pipeline:** `packages/cli/src/cli/commands/start.ts` still writes raw per-key buffers after rendering. Phase 18 can keep this seam by replacing how buffers are produced, not how they are written. [VERIFIED: codebase scan of packages/cli/src/cli/commands/start.ts]
- **Current render boundary is SVG -> sharp -> raw buffer:** `packages/cli/src/render/text-image.ts` builds SVG, rasterizes with `sharp(Buffer.from(svg))`, then outputs raw pixel buffers. Phase 18 should supersede this backend rather than layering a second parallel output format. [VERIFIED: codebase scan of packages/cli/src/render/text-image.ts]
- **Current authoring contract is still `DeckButtonProps`:** `packages/cli/src/render/types.ts` exposes standardized fields like `label`, `icon`, `background`, `variant`, and primitive ids. This is the specific contract the user wants to replace with DOM-authored button components. [VERIFIED: codebase scan of packages/cli/src/render/types.ts and 18-CONTEXT.md]
- **Addon API already has the right lifecycle inputs:** `packages/cli/src/addon/api.ts` already gives button instances `hostContext`, `methods`, `theme`, and `config`, plus a `render(): ReactElement` seam. That means the browser migration can build on an existing React-returning addon model rather than inventing one from scratch. [VERIFIED: codebase scan of packages/cli/src/addon/api.ts]

## Recommended Approach

Use Playwright-driven Chromium as the rendering backend and treat the browser screenshot buffer as the new raster source, while preserving the daemon's existing runtime orchestration and per-key device write seams. [CITED: https://playwright.dev/docs/screenshots] [VERIFIED: codebase scan of packages/cli/src/deck/runtime.ts and packages/cli/src/cli/commands/start.ts]

Plan the phase as a hard contract switch from SVG-oriented `DeckButtonProps` descriptions to DOM-authored React button components that return HTML/CSS, with a core-owned React `buttonFrame` applied by default unless `full_surface: true`. [VERIFIED: codebase scan of 18-CONTEXT.md, packages/cli/src/render/types.ts, and packages/cli/src/addon/api.ts]

Sequence the work so the first tracer bullet proves the full deck page, in-place DOM patching, screenshot capture, crop-to-key output, and one migrated builtin button end to end before wider button migration or richer media slices. That keeps the highest-risk browser/render integration honest early while respecting the user's chosen architecture. [VERIFIED: codebase scan of 18-CONTEXT.md] [ASSUMED]
