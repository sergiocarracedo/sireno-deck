# Phase 2 Research — Device + Rendering

**Phase:** 2 — Device + Rendering
**Date:** 2026-05-12

## Don't Hand-Roll

- Use `@elgato-stream-deck/node` for hardware enumeration and device access rather than reverse-engineering HID packet formats yourself. [VERIFIED: project requirement boundary in `.planning/PROJECT.md`] [CITED: Elgato HID intro https://docs.elgato.com/streamdeck/hid/intro/]
- Use `react-reconciler` for the render bridge instead of inventing a custom component tree diffing engine. The host config model is the intended extension point for non-DOM targets. [CITED: React reconciler README search result: https://github.com/facebook/react/blob/main/packages/react-reconciler/README.md] [CITED: npm package result for `react-reconciler`]
- Use `sharp` for image composition and buffer generation instead of canvas/Jimp-first experiments. It supports direct blank image creation, text generation, composites, and buffer output in one pipeline. [CITED: Sharp docs and examples via `/lovell/sharp`] [CITED: https://sharp.pixelplumbing.com/api-composite/] [CITED: https://sharp.pixelplumbing.com/api-output/]

## Common Pitfalls

- **Wrong package-level assumptions after rename.** The live code has moved from `packages/sireno-deck` to `packages/cli`, while planning docs still reference the old path. Planning against stale paths will create broken tasks immediately. [VERIFIED: codebase scan]
- **Trying to solve multi-device support in Phase 2.** Requirements only need Linux connection, reconnect, and one visible render path. The discuss-phase locked behavior is single-device auto-pick with a serial selector, not full multi-device orchestration. [VERIFIED: `02-CONTEXT.md`]
- **Building a fake renderer first.** A one-off “render image then write it” proof will satisfy the first demo, but it will fight Phase 3+ if it bypasses React reconciliation and per-key state tracking. The context explicitly chose real architecture with a narrow feature surface. [VERIFIED: `02-CONTEXT.md`]
- **Missing write dedupe.** Phase 2 explicitly requires no unnecessary rewrites. If the write layer does not cache last rendered output per key, the implementation will miss `RENDER-03` even if the image appears correctly. [VERIFIED: `.planning/REQUIREMENTS.md`] [CITED: Sharp supports buffer output for direct comparison/hash generation]
- **Reconnect without state restoration.** Simply reconnecting the HID handle is not enough. The user selected “restore last rendered state,” so the write layer needs retained per-key output that can be replayed. [VERIFIED: `02-CONTEXT.md`]
- **Linux permission failures with opaque errors.** Phase 2 includes a Linux-specific udev guidance requirement. Device-open failures need a Linux-aware path that can distinguish “device absent” from “device visible but inaccessible.” [VERIFIED: `.planning/REQUIREMENTS.md`] [ASSUMED: exact API shape will depend on the selected node Stream Deck library]
- **Foreground daemon cleanup gaps.** Existing shutdown only removes the PID and flushes the logger. Once device access is added, signal cleanup must blank/close the device cleanly or disconnect handling will be inconsistent. [VERIFIED: `packages/cli/src/util/daemon.ts`]

## Existing Patterns in This Codebase

- `packages/cli/src/cli/commands/start.ts` already owns config loading, stale PID cleanup, PID writes, and signal handler registration. Phase 2 should attach device bootstrapping there rather than inventing another process entry. [VERIFIED: codebase scan]
- `packages/cli/src/util/daemon.ts` centralizes shutdown behavior and is the natural integration point for device disconnect/blanking cleanup. [VERIFIED: codebase scan]
- `packages/cli/src/core/schemas.ts` is the single schema source of truth; device selection additions should land there, not in ad hoc runtime parsing. [VERIFIED: codebase scan]
- Tests already use temporary XDG directories for deterministic filesystem behavior. Device/render tests should reuse that pattern where possible for PID/state interactions. [VERIFIED: `loader.test.ts`, `daemon.test.ts`]

## Recommended Approach

### 1. Split the phase into two tracer bullets
- First tracer bullet: detect/select/connect one device on Linux, report model + serial, and survive disconnect/reconnect with sparse retry logs.
- Second tracer bullet: boot a minimal React renderer that targets per-key image buffers, render a static text component to key `0`, blank the remaining keys, and dedupe writes.

This keeps each plan demoable on its own while preserving the chosen architecture. [HIGH confidence]

### 2. Add a dedicated device abstraction layer now
- Create a device module that exposes: enumerate devices, choose a device from config/selection rules, connect, subscribe to disconnect/reconnect events, write a key image, blank keys, and close.
- Keep serial/model metadata in the abstraction so the CLI can log selection failures and status cleanly.

This isolates library-specific HID behavior from the CLI and render layers. [HIGH confidence]

### 3. Make reconnect state-driven, not ad hoc
- Maintain a small runtime state object containing: selected device criteria, current connection, reconnect deadline, and last rendered buffers per key.
- On disconnect: mark unavailable, begin retry loop with sparse logs.
- On reconnect: reattach the device handle and replay cached key buffers.

This directly serves `INFRA-03` and the discuss-phase restore decision. [HIGH confidence]

### 4. Keep the initial React renderer intentionally tiny
- Use `react-reconciler` with a host config that produces an in-memory representation of a button visual tree for a single key.
- The commit path should end in `render visual -> sharp buffer -> compare against previous buffer -> write only if changed`.
- Do not introduce full deck navigation, button registry, or scheduler behavior in the first render slice; those belong to later phases even if the module layout anticipates them.

This honors the “real architecture, narrow feature” decision. [HIGH confidence]

### 5. Use simple text rendering through Sharp first
- Generate a deterministic text image (`Hello` / `Hello World`) using Sharp’s text/image creation APIs or SVG/text composite input.
- Blank every other key to a known output on startup and shutdown.

This gives the clearest first manual demo and easiest debugging surface. [MEDIUM confidence: exact text rendering approach should be validated during implementation]

### 6. Plan Linux udev guidance explicitly
- Include a user-facing diagnostic path for “device present but inaccessible.”
- The exact implementation may rely on library error signatures plus a Linux-side `lsusb` or equivalent probe, but the plan should treat this as an observable behavior, not a vague future enhancement.

[MEDIUM confidence: exact detection method requires implementation validation on Linux hardware]

## Sources

- [CITED] Elgato HID intro: https://docs.elgato.com/streamdeck/hid/intro/
- [CITED] Elgato device lifecycle guide snippets surfaced via Context7 `/websites/elgato_streamdeck_sdk`
- [CITED] React reconciler package/docs surfaced via search and Context7 `/reactjs/react.dev`
- [CITED] Sharp docs: https://sharp.pixelplumbing.com/api-composite/ and https://sharp.pixelplumbing.com/api-output/
- [VERIFIED] `.planning/phases/02-device-rendering/02-CONTEXT.md`
- [VERIFIED] `packages/cli/src/cli/commands/start.ts`
- [VERIFIED] `packages/cli/src/util/daemon.ts`
- [VERIFIED] `packages/cli/src/core/schemas.ts`
