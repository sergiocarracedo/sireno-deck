# Phase 27: Theme Fallback And Emulator Shell Boundaries - Context

**Gathered:** 2026-05-27
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Tighten the already-shipped theme and browser-shell seams without adding new surface capabilities. This phase removes the legacy YAML theme fallback path, makes the built-in default theme package frame the only fallback frame contract, aligns the TypeScript/TSX runtime path so runtime-authored `.tsx` files do not require manual `import React from 'react'` boilerplate just to avoid execution failures, ensures edits to theme runtime files such as `themes/default/ButtonFrame.tsx` participate in the existing autoupdate/reload path, and limits the deck glass/chrome treatment to emulator mode instead of all browser-rendered surfaces. It does not broaden theme responsibilities beyond button chrome, introduce a second theme runtime entrypoint, add new emulator capabilities, or turn shell polish into a separate visual redesign phase.

## Implementation Decisions

### Theme Fallback Contract
- Remove the `legacy_yaml` theme resolution branch from `packages/cli/src/config/theme.ts` rather than preserving dual theme systems.
- The built-in default theme package becomes the sole fallback source for `buttonFrame`; core should stop owning a separate fallback frame implementation in `packages/cli/src/render/button-frame.tsx`.
- Keep the manifest-backed theme runtime contract as the only supported theme model for built-in and filesystem themes.

### TSX Runtime Policy
- Phase 27 should establish one truthful runtime policy so `.tsx` runtime modules execute without requiring file-by-file `import React from 'react'` boilerplate when that import is otherwise unused.
- The fix should align the actual CLI/emulator/runtime execution seam with the authored TSX contract rather than relying on scattered compatibility imports.
- Preserve honest runtime behavior on the real `tsx` execution path used by the CLI, theme loader, and related tests.

### Theme Reload Coverage
- Theme runtime edits must stay inside the same autoupdate/reload flow already used by `start.ts` through watched `filePaths`.
- Changes to `packages/cli/src/themes/default/ButtonFrame.tsx` must trigger the same reload path as changes to `manifest.yml`, `index.ts`, or theme stylesheet assets.
- Planning should treat missing `ButtonFrame.tsx` watch coverage as a truthfulness bug in the existing file-graph contract, not as a request for a separate watch subsystem.

### Emulator-Only Shell Chrome
- The deck glass/highlight shell treatment should appear only when rendering for emulator mode.
- Shared browser-rendered deck output should keep the same document/layout contract, but non-emulator surfaces should not inherit emulator-specific glass polish.
- Theme `buttonFrame` still owns per-button chrome only; emulator-only shell styling remains a deck-document concern.

### Agent's Discretion
- Exact implementation seam for replacing the core frame fallback with the built-in default theme package frame, as long as the fallback ownership moves out of `packages/cli/src/render/button-frame.tsx`.
- Exact runtime/tooling fix that removes the need for manual runtime `React` imports while staying honest on the real execution path.
- Exact watcher/file-path adjustments needed so `ButtonFrame.tsx` edits reliably trigger reload.
- Exact visual reduction for non-emulator deck rendering, as long as emulator mode keeps the glass treatment and other surfaces do not.

## Specific Ideas

- `packages/cli/src/config/theme.ts` is the primary seam for deleting legacy YAML theme support and centralizing fallback ownership around the built-in default theme package.
- `packages/cli/src/render/dom-host.tsx` currently applies shell gradients/glass styling unconditionally at the shared deck-document layer; this is likely the main integration point for emulator-only chrome gating.
- `packages/cli/src/cli/commands/start.ts` already watches `loadedConfig.filePaths`, so Phase 27 should preserve that single reload mechanism and make sure theme runtime file discovery truthfully includes `ButtonFrame.tsx`.
- `packages/cli/src/themes/default/index.ts` plus `ButtonFrame.tsx` are already the real built-in default-theme runtime graph and should become the fallback contract instead of a parallel core-owned frame.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`
- `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`
- `.planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md`
- `.planning/phases/26-browser-deck-react-shell-polish/26-CONTEXT.md`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/config/theme.test.ts`
- `packages/cli/src/render/button-frame.tsx`
- `packages/cli/src/render/button-frame.test.tsx`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/dom-host.test.tsx`
- `packages/cli/src/themes/default/index.ts`
- `packages/cli/src/themes/default/ButtonFrame.tsx`
- `packages/cli/src/themes/default/manifest.yml`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/cli/commands/start.test.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/theme.ts` already owns theme resolution, tolerant runtime export lookup, runtime file-path collection, stylesheet asset collection, and the remaining legacy YAML fallback branch.
- `packages/cli/src/themes/default/index.ts` already exports the built-in default `buttonFrame` from `ButtonFrame.tsx`, making it the natural fallback contract once the parallel core fallback is removed.
- `packages/cli/src/cli/commands/start.ts` already merges config and theme `filePaths` into one watched reload list and recreates those watchers after runtime reload.
- `packages/cli/src/render/dom-host.tsx` already owns deck-document shell styling, inline warning placement, and slot layout for both browser capture and emulator serving.

### Established Patterns
- Phase 20 moved the project onto manifest-backed theme packages and kept `buttonFrame` scoped to button chrome instead of page layout.
- Phase 25 kept `manifest.main` as the only theme runtime entrypoint and made the built-in default theme a truthful TS/TSX-backed proof path.
- Quick task 015 showed that runtime TSX behavior must be verified on the actual `tsx` execution seam, not inferred from Vitest-only success.
- Phase 26 kept one shared deck document for browser capture and emulator serving; Phase 27 should preserve that shared document seam while narrowing when emulator-only chrome is applied.

### Integration Points
- Remove the `legacy_yaml` branch and parallel core fallback wiring in `packages/cli/src/config/theme.ts`, replacing it with built-in default-theme fallback ownership.
- Update `packages/cli/src/render/dom-host.tsx` and the call sites that invoke `renderDomDeck(...)` so emulator mode can opt into shell glass treatment while non-emulator rendering does not.
- Extend `packages/cli/src/config/theme.test.ts`, `packages/cli/src/cli/commands/start.test.ts`, and `packages/cli/src/render/dom-host.test.tsx` so fallback ownership, TSX runtime truthfulness, watched file graphs, and emulator-only shell styling are proved on the real seams.

## Deferred Ideas

- New theme capabilities beyond the existing `manifest.main` plus `buttonFrame` contract.
- A separate watch/autoupdate subsystem just for themes.
- Broader browser-shell redesign beyond removing emulator-only glass from shared non-emulator rendering.
- Any return to single-file YAML themes as a supported long-term theme model.

---
*Phase: 27-theme-fallback-and-emulator-shell*
*Context gathered: 2026-05-27*
