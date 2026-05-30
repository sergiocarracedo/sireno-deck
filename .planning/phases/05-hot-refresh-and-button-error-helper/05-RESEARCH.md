# Phase 5: Hot Refresh and Button Error Helper - Research

**Researched:** 2026-05-30
**Phase goal:** Restore honest hot refresh for config and React source edits, and provide a shared button-facing error helper that renders a warning triangle plus a four-digit error code while logging deck/button-aware diagnostics.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| External raw-source dev watching | Keep the existing `tsx watch ... start --config config.yml` seam as the authoritative full-process restart path for source edits instead of inventing a second custom watcher. | `tsx` watch already tracks imported files, supports explicit `--include` globs, and is documented as a separate watch mode with stronger robustness than Node's built-in `--watch`. [CITED: https://tsx.hirok.io/watch-mode] | [CITED: https://tsx.hirok.io/watch-mode] |
| In-process config/runtime reload | Reuse the existing `watchConfigFiles(...)` plus `reloadRuntime()` seam in `packages/cli/src/cli/commands/start.ts` instead of adding a parallel runtime loader. | The current daemon path already rebuilds runtime state, preserves navigation, replaces watchers only after successful reload, and keeps invalid config reloads on the temporary full-deck error surface. [VERIFIED: packages/cli/src/cli/commands/start.ts] | [VERIFIED: packages/cli/src/cli/commands/start.ts] |
| Button failure presentation | Add one runtime-owned shared helper near `packages/cli/src/deck/runtime.ts` instead of letting each button render bespoke error UI. | The runtime already owns button identity, deck context, and async failure boundaries, so it can attach stable four-digit codes and deck/button-aware logs without pushing operational concerns into addon UI code. [VERIFIED: packages/cli/src/deck/runtime.ts] | [VERIFIED: packages/cli/src/deck/runtime.ts] |
| Config reload failure surface | Preserve `showTemporaryErrorDeck(...)` for invalid config reloads instead of unifying config failures with button-local errors. | The existing runtime tests already prove the full-deck temporary error behavior and stack recovery contract; replacing it would widen scope and risk a regression the phase context explicitly rejected. [VERIFIED: packages/cli/src/deck/runtime.test.ts] | [VERIFIED: packages/cli/src/deck/runtime.test.ts] |

## Common Pitfalls

### Watchers drift from the runtime boundary
**What goes wrong:** A phase tries to make one watch mechanism handle every change type, so process restarts, config-graph reloads, and mounted invalidation blur together into behavior nobody can explain. [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/commands/start.ts]
**Why:** This repo already has two distinct live seams: the workspace-root `tsx watch` restart loop and the in-process `watchConfigFiles(...)` reload path. Treating them as one mechanism hides where code actually reloads. [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/commands/start.ts]
**How to avoid:** Plan explicit ownership: source edits that rely on module re-execution should stay on the external `tsx` restart seam, while config-file-graph reloads continue through `start.ts` and rebuild the runtime truthfully. [CITED: https://tsx.hirok.io/watch-mode] [VERIFIED: packages/cli/src/cli/commands/start.ts]

### File-watch reliability is over-assumed
**What goes wrong:** Reload logic assumes every filesystem change is delivered identically across platforms and rename/write flows. [CITED: https://nodejs.org/api/fs.html#fswatchfilename-options-listener]
**Why:** Node documents caveats for `fs.watch`, including platform-dependent behavior, inode replacement edge cases, and inconsistent filename delivery. [CITED: https://nodejs.org/api/fs.html#fswatchfilename-options-listener]
**How to avoid:** Keep in-process watching narrow, debounce it, and prefer full runtime rebuilds over fragile fine-grained invalidation when a file event does arrive. [VERIFIED: packages/cli/src/cli/commands/start.ts] [CITED: https://nodejs.org/api/fs.html#fswatchfilename-options-listener]

### Module-cache assumptions make hot refresh dishonest
**What goes wrong:** A reload path assumes importing a changed addon/theme/runtime module automatically re-executes fresh code. [CITED: https://nodejs.org/api/modules.html] [CITED: https://nodejs.org/api/esm.html]
**Why:** CommonJS uses `require.cache`, while Node's ESM loader keeps a separate cache and does not use `require.cache`. This means source reload truth depends on the actual loader seam, not wishful thinking. [CITED: https://nodejs.org/api/modules.html] [CITED: https://nodejs.org/api/esm.html]
**How to avoid:** Use the external `tsx watch` process restart as the default source-edit truth, and only claim in-process source refresh where the runtime explicitly owns the invalidation path already. [CITED: https://tsx.hirok.io/watch-mode] [VERIFIED: packages/cli/src/cli/commands/start.ts]

### Error UI grows into a second logging system
**What goes wrong:** Button-local failures start carrying too much text on-device, and logs lose the structured context needed to debug addon/runtime issues. [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md]
**Why:** The device surface is tiny; the phase context explicitly wants a compact warning triangle plus four-digit code, with richer detail in logs. [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md]
**How to avoid:** Keep the button UI to code plus icon, allocate error codes in runtime-owned helpers, and log structured deck id, button position, button type, and error code at the capture seam. [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md] [VERIFIED: packages/cli/src/deck/runtime.ts]

## Existing Patterns in This Codebase

- **Workspace-root dev restart seam:** `package.json` exposes `cli:dev` as `pnpm exec tsx watch --include ... packages/cli/src/cli/index.ts start --config config.yml`, which is already the truthful source-edit restart path. [VERIFIED: package.json]
- **Runtime rebuild on config reload:** `startDaemon()` in `packages/cli/src/cli/commands/start.ts` rebuilds the runtime, preserves the navigation stack, swaps browser/device lifecycle ownership, and reinstalls watchers only after a successful reload. [VERIFIED: packages/cli/src/cli/commands/start.ts]
- **Config reload fallback surface:** `packages/cli/src/deck/runtime.ts` exposes `showTemporaryErrorDeck(detailLines)` and `packages/cli/src/deck/runtime.test.ts` already proves that this temporary deck does not destroy the underlying navigation stack. [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: packages/cli/src/deck/runtime.test.ts]
- **Runtime-owned async error capture seam:** `reportRuntimeError(...)` is already called from runtime-owned async catch paths, but currently only `console.error`s; that is the narrowest existing place to attach button-aware logging and helper rendering. [VERIFIED: packages/cli/src/deck/runtime.ts]
- **Node owns behavior, React renders views:** Prior phases 22, 24, and 28 all locked the runtime ownership model, so Phase 5 should keep refresh and error policy in Node-owned runtime code rather than component leaf code. [VERIFIED: .planning/phases/22-browser-deck-emulator/22-CONTEXT.md] [VERIFIED: .planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

## Recommended Approach

Phase 5 should plan around two explicit refresh truths instead of pretending one mechanism owns both: the external `tsx watch` loop remains the authoritative full-process source-edit restart seam, while the in-process `start.ts` watcher continues to own config-file-graph reloads and runtime rebuilds. [CITED: https://tsx.hirok.io/watch-mode] [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/commands/start.ts]

The implementation plans should preserve `showTemporaryErrorDeck(...)` for invalid config reloads, then add a runtime-owned button error helper beside the existing runtime failure seams so button-level failures surface a compact warning triangle and four-digit code while logs capture deck id, button position, button type, and code. [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: packages/cli/src/deck/runtime.test.ts] [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md]

Any narrower invalidation for mounted buttons should be treated as an explicit runtime-owned optimization inside the in-process seam, not as a replacement for the source-edit restart truth. [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md] [VERIFIED: packages/cli/src/deck/runtime.ts]
