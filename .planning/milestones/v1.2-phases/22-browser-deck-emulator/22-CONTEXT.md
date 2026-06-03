# Phase 22: Browser deck emulator - Context

**Gathered:** 2026-05-24
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Let users and developers run the real Sireno deck locally in the browser without Stream Deck hardware, using emulated device layouts and mouse-driven interaction for preview and testing. This phase adds a browser-only emulator runtime mode and local page focused on the virtual deck surface; it does not add a config editor, keyboard shortcut layer, remote multi-user access, or a separate sandboxed safety model.

## Implementation Decisions

### Emulator Runtime Model
- The emulator should run the same real deck runtime used by the hardware path, not a preview-only renderer and not a separate emulator-specific runtime.
- The physical Stream Deck transport should be replaced by a virtual browser-backed device/event seam so runtime lifecycle, polling, actions, navigation, and rendering stay honest.
- Browser-only emulator mode must be valid even when no physical Stream Deck is attached.
- The emulator should run real actions and status commands rather than sandboxing or disabling them for the first rollout.

### Browser Interaction Contract
- Mouse interaction should map to full press/release semantics rather than a simplified click-only model.
- The browser surface should visibly reflect real pressed and hold states so interaction debugging matches the real runtime/button-frame contract.
- Keyboard shortcuts are out of scope for the first rollout; mouse input is the only required interaction path.

### Emulated Device Selection
- Users should choose the emulated device layout through an explicit selector in the browser UI.
- If the selected virtual device cannot represent the configured deck layout, the emulator should fail clearly with an emulator-specific error state rather than clipping or auto-switching.
- Changing the selected emulated device should restart the runtime against the new device shape instead of hot-swapping key count/layout in place.

### Entry Point and Scope Boundary
- The emulator should ship as a dedicated CLI mode or command, separate from the normal hardware-start path.
- The first rollout should serve one local page focused on the virtual deck plus the minimum controls needed for device selection and runtime status.
- The first rollout explicitly excludes config editing UI, keyboard shortcuts, multi-user or remote access, action sandboxing, and session recording/playback.

### Agent's Discretion
- Exact command name, CLI flags, and local-server/page boot shape, as long as the emulator stays an explicit runtime mode rather than an implicit fallback.
- Exact visual design of the local emulator page and status chrome, as long as the deck remains the primary surface and device switching stays visible.
- Exact implementation shape of the virtual device seam and runtime restart flow when the emulated device changes.

## Specific Ideas

- The emulator should feel like "run the real deck in a browser" rather than "render a mock preview".
- Device switching should happen inside the emulator page so users without hardware can explore different layouts quickly.
- The browser page should make press/hold states visible, not just dispatch actions invisibly.
- This mode exists both for developers and for users who want to try or debug a deck without owning hardware.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-CONTEXT.md`
- `.planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md`
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`
- `.planning/phases/21-theme-font-assets-for-browser-rendering/21-CONTEXT.md`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/render/browser-renderer.ts`
- `packages/cli/src/render/dom-host.tsx`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/browser-renderer.ts`: already owns the persistent browser page, deck capture, per-key cropping, and key-count-based layout logic that the emulator can reuse.
- `packages/cli/src/deck/runtime.ts`: already owns button lifecycle, navigation, polling, and `down`/`up` event handling, so the emulator should plug into it rather than recreate runtime behavior.
- `packages/cli/src/cli/commands/start.ts`: already wires config loading, runtime startup, browser rendering, and device connection together, making it the natural seam for an explicit browser-emulator mode or sibling command.
- `packages/cli/src/render/dom-host.tsx`: already renders the deck as one browser page and composes the DOM-backed button surface used by the shipped renderer path.

### Established Patterns
- Runtime owns behavior; rendering and transport are pluggable seams beneath it.
- The browser renderer is already the honest visual path, so the emulator should extend that path instead of introducing another rendering model.
- Real-device bugs have historically survived narrow tests, so emulator behavior should stay close to the real runtime/device seams rather than inventing preview-only shortcuts.
- Explicit runtime modes are preferred over hidden fallback behavior.

### Integration Points
- Add a virtual device/event transport alongside the hardware lifecycle in `packages/cli/src/cli/commands/start.ts` or adjacent CLI command wiring.
- Feed browser-page mouse interactions into the runtime through the same `StreamDeckKeyEvent` shape currently consumed by `packages/cli/src/deck/runtime.ts`.
- Reuse key-count/layout knowledge from `packages/cli/src/render/browser-renderer.ts` for the emulator selector and deck surface sizing.
- Surface emulator-specific runtime/layout errors through the browser page rather than silently clipping unsupported device shapes.

## Deferred Ideas

- Config editing UI inside the emulator page.
- Keyboard shortcuts or broader keyboard navigation.
- Multi-user or remote browser access.
- Action sandboxing or permission prompts that differ from the normal trusted runtime model.
- Session recording and playback.

---
*Phase: 22-browser-deck-emulator*
*Context gathered: 2026-05-24*
