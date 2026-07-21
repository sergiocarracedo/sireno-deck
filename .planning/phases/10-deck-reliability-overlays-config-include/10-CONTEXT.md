# Phase 10: Deck Reliability, Application Overlays, Config Includes, and Hardware Lifecycle - Context

**Gathered:** 2026-07-21
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase ships four workstreams, scoped per the user's original ask:

1. **Main-deck image icons render on first paint** — fix the blank-fallback symptom caused by React mounting before the WS `assets` message has been processed. Block first paint until assets are received.
2. **Chrome overlay addon + working VS Code / OpenCode active-window detection on Linux Wayland+GNOME** — create the `chrome-overlay` external addon, register it in `config.yml`, and fix `system/providers/active-app/wayland-gnome.ts` so `window_name` triggers match focused windows.
3. **Nested YAML config includes with `!include path/to/file.yml`** — recursive, path-relative to defining file, deep-merge for objects / concat-with-last-wins for arrays, available at top level and any subtree.
4. **Real-hardware startup splash + black shutdown** — push `logoFull.png` (composited on black) to the device between `connectStreamDeck` and `spawnFrontendVite`. Black shutdown is already wired (no work).

New capabilities (comments, search/filter, additional overlays) are out of scope — capture as deferred ideas if surfaced.

</domain>

<decisions>
## Implementation Decisions

### Workstream 1 — Image icons on first render

- **Root cause**: to be confirmed by research/planning (user is not certain; possible causes are (a) React mounts before WS handshake completes, (b) `assets` message arrives after `deck-config` and React renders before processing assets, (c) `bridge.onConnection` race during Vite hot-reload).
- **Fix shape**: block first frontend paint until the WS `assets` message has been received and stored in the asset cache.
- **Loading state**: render a loading skeleton / spinner on the frontend while waiting for assets. Concrete skeleton design is planner's call.
- **Asset registry**: keep the existing pattern in `packages/cli/src/core/icon-asset-registry.ts` — `getUnsentAssets(new Set())` re-sent on each new WS connection (already in place; do not regress the previous dedupe-by-id fix).
- **Test strategy**: add a test that simulates the timing — open the frontend with a deferred `assets` message and assert it does not render with broken icons.

### Agent's Discretion (Workstream 1)
- Exact skeleton/spinner component (plain CSS spinner vs. existing ButtonFrame error variant vs. new component).
- Whether to also send a "ready to render" ack message from frontend back to CLI (probably no — adds complexity).
- Whether to preload a small set of critical assets via Vite virtual modules (probably no — out of scope).

### Workstream 2 — Chrome overlay + active-window detection

- **Chrome overlay**: external addon at `~/works/opensource/sireno-deck-addons/chrome-overlay/`, mirroring `vscode-overlay` and `opencode-overlay` structure (`sirenodeck.json`, `index.js`, `assets/icon.png`).
- **Chrome trigger process names**: `['chromium', 'chrome', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'Brave']`.
- **Chrome button set**: a fresh, curated set of Chrome shortcuts (new tab, close tab, reopen tab, new window, new incognito, switch tab, find, devtools, etc.) — NOT a port of the existing `chrome` deck in `config.yml`.
- **Chrome registration**: add `~/works/opensource/sireno-deck-addons/chrome-overlay` to the `addons:` list in `config.yml` (existing entries: `vscode-overlay`, `opencode-overlay`).
- **VS Code / OpenCode detection fix**: extend `system/providers/active-app/wayland-gnome.ts` so `windowTitle` is populated, not always `null`. Mechanism: **D-Bus call to `org.gnome.Shell` / `org.gnome.Mutter`** to enumerate windows and read the focused window's title. No GNOME extension install needed; pure code change.
- **OpenCode trigger**: keep `window_name` patterns only (no `process_name` fallback) — relies on the wayland-gnome fix to make window titles reachable.
- **Backwards compatibility**: the fix must not break the existing `process_name` matching on Wayland+GNOME (it should now ALSO provide `windowTitle`).

### Agent's Discretion (Workstream 2)
- Exact D-Bus interface and method shape (researcher should check `org.gnome.Shell.Eval`, `org.gnome.Shell.Extensions`, Mutter `WindowProperties`, or shell introspection).
- Whether to cache window list or query per-call (cache likely fine for active-app polling).
- Whether to ship a fallback heuristic for non-GNOME Wayland compositors (Sway, Hyprland) — user did not ask, defer.

### Workstream 3 — Nested YAML config includes

- **Notation**: YAML custom tag `!include path/to/file.yml`. Implemented via `yaml.parseDocument` custom tag handler (loader already uses parseDocument with `keepSourceTokens`).
- **Scope**: usable at top level AND at any subtree. A top-level `!include` replaces the whole config subtree (file can also be a valid standalone root config); a subtree `!include` replaces only that subtree.
- **Path resolution**: relative paths resolve against the file containing the include. Absolute paths allowed (resolve against filesystem root). Imported files can import more files — recursive descent.
- **Merge semantics**:
  - **Objects**: deep merge (keys at the same level recursively merged).
  - **Arrays**: concatenate. On `id` collision, **last definition wins**.
- **Cycle detection**: track visited file paths during recursion; throw a `ConfigError` on circular reference.
- **Error handling**: missing file → `ConfigError`. Bad YAML → existing loader error path.

### Agent's Discretion (Workstream 3)
- Whether to expand button references (`expandButtonReferences`) AFTER include resolution (probably yes, but verify against existing tests).
- Whether `!include` should accept glob patterns (probably no — out of scope, defer).

### Workstream 4 — Real-hardware startup splash + black shutdown

- **Splash path**: bundle `logoFull.png` into `packages/cli/src/assets/logoFull.png` in sireno-deck-2 (file already exists — same path, same relative location as the legacy repo). CLI uses its own bundled copy. **No cross-repo runtime dependency.**
- **Splash background**: black (`#000000`). Matches the black shutdown frame for visual continuity. Logo floats on black.
- **Splash implementation**: reuse the legacy `startup-placeholder.ts` logic — sharp loads `logoFull.png`, composites on black background, resizes to deck layout (using `STREAM_DECK_KEY_PRESET` keyWidth/keyHeight), splits into per-key buffers, calls `device.fillKeyBuffer` per key. Move/adapt into sireno-deck-2 as `packages/cli/src/render/push-raw-image.ts`.
- **Splash timing**: in `RealOutputClient.init`, between `connectStreamDeck` (line 95) and `spawnFrontendVite` (line 174). Implemented via the existing-but-unimplemented `pushRawImage(filePath: string)` on `OutputHandle` (declared in `outputClient/types.ts:50`).
- **Splash failure mode**: if sharp fails or the file is missing, **log warn and skip — do not block CLI startup**. The deck just goes straight to Playwright rendering.
- **Black shutdown**: ALREADY WIRED. `pushBlackFrame()` (`real.ts:212-225`) is called from `run.ts:1050-1056` on SIGINT/SIGTERM. No code changes needed; the planner may add a test to lock in the behavior.

### Agent's Discretion (Workstream 4)
- Whether to also fire `pushBlackFrame` on `uncaughtException` / `unhandledRejection` (user said "already complete — no extra work", so NO).
- Splash timeout / retry (probably no — push once, then move on).

</decisions>

<specifics>
## Specific Ideas

- "Notation open to suggestions, e.g. `!include`" → went with `!include` (user's example).
- "Paths relative to the file defining them, imported files able to import more files" → recursive, relative-to-defining-file.
- "Send `logoFull.png` directly before Playwright/frontend initialization (not emulator)" → splash goes only through `RealOutputClient.init`, not the emulator path.
- "Render a black deck on CLI shutdown" → already in place via `pushBlackFrame`.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/packages/cli/src/render/startup-placeholder.ts` — legacy splash logic to reuse.
- `/works/opensource/sireno-deck/packages/cli/src/assets/logoFull.png` — legacy logo (already copied into sireno-deck-2 at the same relative path).
- `/works/opensource/sireno-deck-addons/vscode-overlay/index.js` — addon pattern to mirror for chrome-overlay.
- `/works/opensource/sireno-deck-addons/opencode-overlay/index.js` — overlay addon pattern (window_name trigger, TUI detection).
- `/works/opensource/sireno-deck-2/packages/cli/src/cli/commands/run.ts` — `connectStreamDeck`, `spawnFrontendVite`, `pushBlackFrame` call site (SIGINT/SIGTERM lines 1050-1056).
- `/works/opensource/sireno-deck-2/packages/cli/src/outputClient/real.ts` — `OutputHandle` impl, `init` sequence (lines 86-243), `pushBlackFrame` impl (lines 212-225).
- `/works/opensource/sireno-deck-2/packages/cli/src/outputClient/types.ts` — `OutputHandle` interface (`pushBlackFrame`, `pushRawImage` declared).
- `/works/opensource/sireno-deck-2/packages/cli/src/core/icon-asset-registry.ts` — asset registry; `getUnsentAssets` re-sent per WS connection.
- `/works/opensource/sireno-deck-2/packages/cli/src/config/loader.ts` — `yaml.parseDocument` + `expandButtonReferences` (parse + post-merge pattern).
- `/works/opensource/sireno-deck-2/packages/cli/src/config/schemas.ts` — `RawConfigSchema`, trigger schema (lines 5-13).
- `/works/opensource/sireno-deck-2/packages/cli/src/system/providers/active-app/wayland-gnome.ts` — `windowTitle: null` (lines 148, 188, 195) — the bug to fix.
- `/works/opensource/sireno-deck-2/packages/cli/src/system/providers/active-app/linux.ts` — X11 path via xdotool (lines 60-87).
- `/works/opensource/sireno-deck-2/packages/cli/src/system/glob-match.ts` — glob match for `window_name` triggers (lines 66-73).
- `/works/opensource/sireno-deck-2/packages/cli/src/cli/commands/addon-decks.ts` — addon deck materialization (trigger → `processNames` / `windowNames`).
- `/works/opensource/sireno-deck-2/packages/cli/src/render/render-preset.ts` — `STREAM_DECK_KEY_PRESET` (keyWidth/keyHeight).
- `/works/opensource/sireno-deck-2/packages/cli/src/render/browser-renderer.ts` — `resolveDeckLayout` (columns/rows from keyCount).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`OutputHandle.pushBlackFrame`** (`real.ts:212-225`): implemented, fills every key with a zeroed RGB buffer. Wire-as-is.
- **`OutputHandle.pushRawImage(filePath: string)`**: declared in type (`types.ts:50`) but NOT implemented. This is the slot to fill.
- **`icon-asset-registry.getUnsentAssets(new Set())`**: returns ALL assets every WS connection (after the previous dedupe-by-id bug was removed). Frontend just needs to wait for the message.
- **`addon-decks.ts` → `resolveTriggerProcessNames` / `resolveTriggerWindowNames`**: trigger extraction is already in place — chrome-overlay just needs to set the right `trigger:` values in its `manifest.decks.<key>.createDecks()` return.
- **`expandButtonReferences`** in `config/loader.ts:109`: pattern for post-parse relative-path resolution. `!include` can be implemented as a parse-time tag with similar post-merge semantics.

### Established Patterns
- **External addon pattern**: 3 files in `~/works/opensource/sireno-deck-addons/<name>/` — `sirenodeck.json`, `index.js`, `assets/icon.png`. The `index.js` exports `{ manifest }` with `{ apiVersion, name, buttonTypes, decks: { '<key>': { type, createDecks } } }`.
- **Overlay pattern**: deck has `isOverlay: true`, `paginated: true`, `autoShow: true`, `trigger: { ... }`. `paginateDeck` slices the buttons into pages.
- **Config loader**: `yaml.parseDocument` with `keepSourceTokens`, then `doc.toJSON()`. Custom YAML tags work in `parseDocument` (built-in YAML feature).
- **Legacy startup placeholder**: sharp loads, resize to deck layout, composite on background color, split per-key, fillKeyBuffer each key. Lines 21-46 of legacy `startup-placeholder.ts`.

### Integration Points
- **Workstream 1**: frontend mount logic in `apps/web/src` (React component that subscribes to WS and renders deck) — needs a "block render until assets received" gate.
- **Workstream 2**: `chrome-overlay/index.js` is a NEW file (addon repo is in a different git repo). `config.yml` is a one-line add. `wayland-gnome.ts` is the file to edit.
- **Workstream 3**: `config/loader.ts:70-92` — the `parseDocument` call. Add custom tag handling here. Also `RawConfigSchema` may need to allow arrays-with-objects for the concat-dedupe case.
- **Workstream 4**: `outputClient/real.ts` — implement `pushRawImage`. `RealOutputClient.init` — call `this.pushRawImage(SPLASH_PATH)` between `connectStreamDeck` and `spawnFrontendVite`.

</code_context>

<deferred>
## Deferred Ideas

- **Comments / search / filter in chrome overlay**: not asked, would be its own phase.
- **Brave / Edge / Firefox overlays**: not asked, would be its own phase.
- **GNOME Shell extension for window title (instead of D-Bus)**: more reliable but larger lift; defer unless D-Bus proves insufficient.
- **Non-GNOME Wayland support (Sway, Hyprland)**: out of scope for this phase.
- **Cycle-error recovery / partial config on include failure**: out of scope — fail fast on cycles, log warn on missing files.
- **Glob-pattern includes**: out of scope — single file paths only.

</deferred>

---
*Phase: 10-deck-reliability-overlays-config-include*
*Context gathered: 2026-07-21*