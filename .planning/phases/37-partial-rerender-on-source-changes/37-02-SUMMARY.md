# Plan 37-02 Summary

**Completed:** 2026-06-03

## What was built

All three tasks from Plan 37-02 are implemented in the same commit as Plan 37-01 (3e212d0) since they were naturally layered:

- **CSS-only reload**: `watchAddonSources` checks for `.css` extension before scheduling debounce — CSS changes call `runtime.reloadStylesheet()` directly without debounce
- **reloadStylesheet**: `DeckRuntime.reloadStylesheet()` iterates over all mounted hosts and calls `host.reloadStylesheet()` on each (stub implementation — actual browser transport reload message is a follow-up)
- **Structural fallback**: `updateAddonRegistry` detects add/remove changes, calls `logger.warn` with added/removed types, then calls `requestReloadCallback?.()` which is wired to `reloadRuntime()` in start.ts

## Key files

- `packages/cli/src/cli/commands/start.ts` — `watchAddonSources` with CSS pre-check, cleanup wired to signal handler and error path
- `packages/cli/src/deck/runtime.ts` — `reloadStylesheet()`, `requestFullReload()`, `updateAddonRegistry()` with structural diff
- `packages/cli/src/render/dom-host.tsx` — `MountedDomHost.reloadStylesheet()` stub

## Decisions made

- CSS detection uses filename regex before debounce for immediate response
- `requestReloadCallback` closure pattern preserves existing reload-in-flight/queued semantics
- `reloadStylesheet` is a stub that iterates hosts; actual browser transport reload is deferred

## Notes for downstream

- The CSS detection regex is `/\.(css)$/i` — case insensitive
- `reloadStylesheet()` is a stub — actual browser transport message passing needs implementation in a follow-up
- Structural changes log added/removed button types at warn level

---
*Plan: 37-02*