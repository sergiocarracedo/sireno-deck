# Plan 37-01 Summary

**Completed:** 2026-06-03

## What was built

Implemented the core addon source watching and registry-diff invalidation path:

- **watchAddonSources**: Exported function that sets up a recursive `fs.watch` on the addons/ root directory with 100ms trailing-edge debounce. Returns cleanup function. Wires into `startDaemon()` after `runtime.start()` and into `applyReloadedRuntime` for config reloads.
- **updateAddonRegistry**: New `DeckRuntime` method that diffs `registry.listButtons()` types against `runningButtonTypes`. Non-structural diffs (same types, content changed) call `invalidateMountedStore()`. Structural diffs (add/remove types) log warning and call `requestFullReload()`.
- **runningButtonTypes**: Set stored in runtime closure, populated on first `start()` call from `addonRegistry.listButtons()`.
- **requestFullReload**: Closure callback stored in runtime, set by start.ts to call `reloadRuntime()`.
- **CSS pre-check**: `watchAddonSources` checks `/\.(css)$/i` before debounce — CSS changes call `runtime.reloadStylesheet()` immediately.
- **LoadedConfig.cwd**: Added to track the working directory for `watchAddonSources` root path.

## Key files

- `packages/cli/src/cli/commands/start.ts` — `watchAddonSources`, `ADDON_RELOAD_DEBOUNCE_MS`, wired cleanup into signal handler, error path, and `applyReloadedRuntime`
- `packages/cli/src/deck/runtime.ts` — `DeckRuntime` interface updated, `runningButtonTypes`, `requestReloadCallback`, `updateAddonRegistry()`, `reloadStylesheet()`, `requestFullReload()`
- `packages/cli/src/config/loader.ts` — `LoadedConfig.cwd` added
- `packages/cli/src/render/dom-host.tsx` — `MountedDomHost.reloadStylesheet()` stub

## Decisions made

- Single recursive watcher on `addons/` root — no per-addon watchers
- 100ms debounce matches existing `CONFIG_RELOAD_DEBOUNCE_MS` pattern
- Structural detection: any type added or removed from running set
- `cwd` from bootstrap used as root for `watchAddonSources` — no glob needed, Node's `fs.watch` recursive mode watches the directory directly

## Notes for downstream

- The `reloadStylesheet()` implementation is a stub — actual browser transport message passing needs follow-up work
- `updateAddonRegistry` does NOT call `invalidateMountedStore()` for structural changes — full restart is required for addon add/remove
- Cleanup is wired for both normal shutdown (signal handler) and error path

---
*Plan: 37-01*