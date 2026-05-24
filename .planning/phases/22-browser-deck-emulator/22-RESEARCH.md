# Phase 22: Browser deck emulator — Research

**Researched:** 2026-05-24
**Phase goal:** Let users and developers run the deck locally in the browser with emulated device layouts and mouse-driven interaction so they can preview and test results without Stream Deck hardware.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Forking emulator behavior from the shipped runtime | Reuse `createDeckRuntime()` with a virtual device/event seam instead of building a second runtime | The runtime already owns button lifecycle, polling, navigation, and `down`/`up` semantics, so a second runtime would drift and double maintenance | [VERIFIED: `packages/cli/src/deck/runtime.ts`], [VERIFIED: `packages/cli/src/device/stream-deck.ts`] |
| Inventing a second browser rendering path | Reuse `renderDomDeck()` and `createBrowserRenderer()` as the deck-page and raster boundary | The browser renderer already has one page, key-count layout logic, and per-key capture/crop behavior; the emulator should extend that path, not duplicate it | [VERIFIED: `packages/cli/src/render/dom-host.tsx`], [VERIFIED: `packages/cli/src/render/browser-renderer.ts`] |
| Using click-only browser input | Preserve separate press/release events and map browser input onto `StreamDeckKeyEvent`-style `down`/`up` events | Phase 22 context explicitly chose real press/release semantics, and Playwright/browser mouse APIs expose explicit `mousedown`/`mouseup` behavior instead of forcing click abstraction | [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`], [CITED: https://playwright.dev/docs/api/class-mouse] |
| Using SSE for browser-to-runtime input | Use a bidirectional channel for browser input, such as a lightweight local WebSocket transport, and reserve SSE only for one-way server push if needed | MDN documents SSE as one-way only, while WebSocket is full-duplex. Emulator state updates are mostly one-way, but button presses need browser-to-runtime messages too | [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events], [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events], [CITED: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket] |
| Building a custom Node WebSocket client abstraction | If a client is needed on the Node side later, prefer the built-in WebSocket client available in Node 22 instead of pulling in a client library just to talk to a local server | Node documents the WebSocket client as stable in v22.4.0+, which matches this repo’s Node 20+ baseline closely enough to treat it as current upstream guidance for forward planning | [CITED: https://nodejs.org/learn/getting-started/websocket] |

## Common Pitfalls

### Preview-only shortcuts can make the emulator lie
**What goes wrong:** The emulator renders something that looks plausible but does not exercise the same runtime, actions, or button event boundaries as the hardware path.
**Why:** It is tempting to wire a browser-only preview directly to `renderDomDeck()` and skip `createDeckRuntime()`, `subscribeKeyEvents()`, and action execution.
**How to avoid:** Keep the runtime authoritative and replace only the physical transport with a virtual device/event seam. Treat the emulator as "hardwareless runtime mode," not "render-only preview." [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `packages/cli/src/deck/runtime.ts`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`]

### Silent clipping hides layout mismatches
**What goes wrong:** Users switch to a smaller virtual device and the emulator quietly renders only a subset of keys, which makes unsupported layouts look valid.
**Why:** The browser host can render any `keyCount`, and clipping feels convenient during implementation.
**How to avoid:** Treat virtual device shape as a real contract and surface an explicit emulator-specific error state when the selected device cannot represent the configured layout. This aligns with the repo’s broader pattern of failing honestly instead of degrading silently. [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `.planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md`]

### Realtime transport choice can be overcomplicated or wrong-way around
**What goes wrong:** The emulator ends up with two different half-fit transports, or it uses SSE where browser input needs duplex communication.
**Why:** Deck image/state updates are mostly server-to-browser, which makes SSE look attractive at first glance.
**How to avoid:** Choose transport based on message direction. SSE is one-way from server to browser; browser button presses still need a separate return path. A single local WebSocket channel is simpler for full-duplex emulator traffic unless planning later finds a strong reason to split state streaming from input. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket]

### Device-shape changes can corrupt runtime assumptions
**What goes wrong:** Changing the virtual device key count in place leaves stale runtime state, key mappings, or render buffers tied to the old shape.
**Why:** The current hardware path treats `connection.info.keyCount` as startup-level data and creates the browser renderer from that shape once.
**How to avoid:** Restart the runtime when the selected emulated device changes. That matches the Phase 22 discussion and fits the existing startup wiring more naturally than in-place mutation. [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`] [VERIFIED: `packages/cli/src/render/browser-renderer.ts`]

### Browser interaction tests can miss the "pressed" state if they collapse to click
**What goes wrong:** Tests confirm actions fire, but they never prove that pressed/hold visuals actually appear during `down` before `up`.
**Why:** Browser automation tools often encourage `click()` helpers, which compress `move + down + up` into one operation.
**How to avoid:** Use explicit mouse `down()` / `up()` style interactions in browser-facing tests or fixtures when the pressed state is part of the contract. Playwright documents these as separate primitives. [CITED: https://playwright.dev/docs/api/class-mouse]

## Existing Patterns in This Codebase

- **Runtime-owned event model:** `StreamDeckKeyEvent` is already a tiny, transport-agnostic shape (`{ keyIndex, type: "down" | "up" }`), and `createDeckRuntime()` consumes it via `subscribeKeyEvents()`. That is the cleanest seam for browser input injection. [VERIFIED: `packages/cli/src/device/stream-deck.ts`] [VERIFIED: `packages/cli/src/deck/runtime.ts`]

- **Lifecycle/transport split already exists:** `createStreamDeckLifecycle()` owns connection, reconnect, and event subscription, while `start.ts` composes it with config loading, runtime startup, and browser rendering. An emulator can follow the same composition pattern with a virtual lifecycle object instead of a physical device. [VERIFIED: `packages/cli/src/device/stream-deck.ts`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`]

- **Browser renderer is already key-count aware:** `resolveDeckLayout()` supports known Stream Deck shapes (`1`, `2`, `3`, `6`, `8`, `15`, `32`) plus a generic fallback grid, which is a natural basis for the emulator’s in-page device selector. [VERIFIED: `packages/cli/src/render/browser-renderer.ts`]

- **One deck page is already the visual model:** `renderDomDeck()` produces a single HTML document with one grid root and per-key slots tagged by `data-sireno-key`, which means the emulator page can stay aligned with the shipped browser-rendered deck semantics instead of inventing a different page model. [VERIFIED: `packages/cli/src/render/dom-host.tsx`]

- **Start-path tests already mock the seams we need:** `packages/cli/src/cli/commands/start.test.ts` mocks both `createStreamDeckLifecycle()` and `createBrowserRenderer()`, which suggests the first emulator slice can stay testable by preserving those seams rather than burying behavior in an opaque command. [VERIFIED: `packages/cli/src/cli/commands/start.test.ts`]

## Recommended Approach

Treat Phase 22 as a transport-and-entrypoint extension of the existing browser runtime, not as a new product architecture. [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`] Confidence: HIGH

The most credible first rollout is an explicit CLI command or mode that starts the normal config/runtime stack, swaps the hardware lifecycle for a virtual lifecycle that emits `StreamDeckKeyEvent` values from browser input, and serves a single local emulator page with visible device selection and runtime status. [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `packages/cli/src/device/stream-deck.ts`] [VERIFIED: `packages/cli/src/deck/runtime.ts`] Confidence: HIGH

For browser/server communication, prefer one simple full-duplex local channel unless planning uncovers a strong reason to split concerns. SSE is clearly one-way and would still require another path for input, while WebSocket fits both runtime-state updates and button-event messages; just keep message volume bounded and explicit, because MDN notes the base WebSocket API has no built-in backpressure. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket] Confidence: HIGH

Plan verification should demand at least one slice that proves honest input semantics (`down` / `up` plus visible pressed state) and one slice that proves device-shape control/error handling, because those are the two areas most likely to drift into a lying preview tool. [VERIFIED: `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`] [VERIFIED: `packages/cli/src/render/browser-renderer.ts`] Confidence: HIGH

## Source Notes

- Official docs and live codebase reads were used because this environment does not expose a dedicated web-search API; DuckDuckGo HTML results were used only to locate current official references before reading the upstream docs directly. [ASSUMED]

---
*Phase: 22-browser-deck-emulator*
*Research gathered: 2026-05-24*
