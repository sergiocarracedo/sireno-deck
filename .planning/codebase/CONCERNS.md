# Concerns

## Fragile Core Hotspots

- `packages/cli/src/device/stream-deck.ts` is 448 lines and mixes selection, connection, event wiring, reconnect logic, and write replay
- `packages/cli/src/render/reconciler.ts` is 395 lines and contains the full custom React host contract plus render description flattening
- `packages/cli/src/render/text-image.ts` is 330 lines and centralizes SVG composition for multiple visual variants
- `packages/cli/src/deck/runtime.ts` is 322 lines and owns activation, instance lifecycle, polling, invalidation, and event routing

These four files are the highest-risk areas for the new milestone because the requested work touches all of them directly.

## Architecture Drift Risk

- Planning state already shows a Phase 5 follow-on discussion that exceeds the original addon-system roadmap scope in `.planning/STATE.md`
- The renderer still hardcodes `IBM Plex Sans, Arial, sans-serif` in multiple SVG builders inside `packages/cli/src/render/text-image.ts`
- The current reconciler supports helper-based authoring but does not yet expose typed JSX intrinsic support
- The `date-time` addon package exists, but current milestone planning indicates its live refresh and richer visual types are not yet settled work

## Security / Trust Model

- Addons are trusted in-process code, so malformed or malicious addons are a product-level trust concern rather than a sandboxed boundary
- Shell command execution is a deliberate feature, so config safety and clear user expectations matter more than runtime isolation today
- I did not find secrets in source comments or the generated map inputs during this scan

## Testing Gaps

- Hardware truth remains important; planning artifacts repeatedly note that green tests did not fully replace on-device UAT
- Render tests emphasize descriptions/buffers, but visual correctness on physical hardware is still a recurring validation gap

## Planning / Repo State Concerns

- The repo currently has planning-history drift: roadmap says Phase 5 is complete, while follow-on context exists for new milestone work on the same subsystem
- There are also active uncommitted workspace changes outside this mapping task, so future automation should stay scoped and avoid broad staging

## Things To Tread Carefully Around

- Addon API versioning in `packages/cli/src/addon/api.ts` and manifest validation paths
- Config validation line-number preservation in `packages/cli/src/config/loader.ts` and `packages/cli/src/config/theme.ts`
- Runtime scheduling ownership in `packages/cli/src/deck/runtime.ts`
- SVG asset/icon-slot assumptions in `packages/cli/src/render/text-image.ts`
