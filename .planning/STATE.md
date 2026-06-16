# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.
**Current focus:** v1.6 — UX Speed & Overlay Extensions. v1.5 is complete — see Milestone History.

## Current Position

Phase: 68 — Chrome overlay deck extensions (v1.6 gap closure, CHROME-01)
Status: **VERIFIED (2026-06-15, 10/10 UAT pass)**. 7 buttons in root `config.yml` chrome deck at positions 0-6 (New tab Ctrl+T, Close tab Ctrl+W, Unclose tab Ctrl+Shift+T, Incognito Ctrl+Shift+N, Reload Ctrl+R, Hard reload Ctrl+Shift+R, Dev tools F12). System back button runtime-injected at n-1 (no collision). Fixture at `packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml`. Loader test (`chrome-deck-shape`) passes 3ms. Commits: c05bfb8 (config.yml), 50f1d67 (fixture), 13f9e38 (loader test), adf22d1 (summary + state + roadmap), 571de82 (VERIFICATION + AGENTS), 7f77dc0 (verify-work UAT 10/10). Next: ship 68 to origin/main.
Last activity: 2026-06-15 — Phase 68 verify-work complete (10/10 UAT pass, status `passed`).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 037 | Overlap emoji-selector launcher grid cells on X and Y | 2026-06-07 | a794fb8 | .planning/quick/037-grid-overlaps-icons/ |
| 036 | Move default theme presentation interfaces to core contract and fix ButtonFrame line 53 | 2026-06-05 | 1d1b359 | .planning/quick/036-move-theme-interfaces-to-core/ |
| 037 | Replace main deck home button with logo + cli version | 2026-06-06 | 23d2a54 | .planning/quick/037-main-deck-home-button-logo-version/ |
| 038 | Lock deck should not show home or back button | 2026-06-06 | a967147 | .planning/quick/038-lock-deck-no-home-back-button/ |
| 041 | Remove .js compiled files and prevent recurrence | 2026-06-08 | 9826feb | .planning/quick/041-remove-js-compiled-files/ |
| 042 | key_macro prop on action button (OS-abstracted in core) | 2026-06-09 | a9cffb0 | .planning/quick/042-key-macro-action-button/ |
| 043 | wayland-gnome active-app provider via DBus (extension hint) | 2026-06-09 | (pending) | .planning/quick/043-gnome-wayland-extension-active-app/ |
| 043 | Inline deck-render log to debug level (reduce per-frame noise) | 2026-06-09 | e2a7d4c | .planning/quick/043-reduce-deck-render-log-noise/ |
| 044 | Add ellipsis to date button weekday text to prevent wrapping | 2026-06-10 | 088454b | .planning/quick/044-date-button-day-name-ellipsis/ |

Progress: [██████████] 100% (7 of 7 in-scope v1.4 phases complete)

### v1.4 Phase Snapshot (2026-06-06 — post Phase 49)

| Phase | Plans | Summaries | Status | Notes |
|-------|-------|-----------|--------|-------|
| 40 — Distribution Build Pipeline | — | — | **Cut — deferred to v1.5** | Node SEA architecturally incompatible with native deps (node-hid, sharp libvips, playwright chromium, dbus x11). See `.planning/solutions/build-errors/node-sea-not-viable-for-native-deps-2026-06-05.md`. |
| 41 — First-Run Chromium Auto-Install | 1 | 1 | Complete | Verified. |
| 42 — System-Reserved Back Button | 2 | 2 | Complete | Runtime wiring deferred via gap-closure plan; helper/validation/component shipped. |
| 43 — Date-Time Calendar Button | 1 | 1 | Complete | Replaced `calendar-sheet` stub with real `date` button. |
| 44 — Media-Volume Buttons | 1 | 1 | Complete | Verification `passed`. |
| 45 — Weather Addon | 1 | 1 | Complete | Verification `passed`, UAT `testing` — manual UAT rerun still pending. |
| 46 — Emoji-Selector Multi-Page | 4 | 4 | Complete | Verification `passed`. Gap-closure plans 46-03 (multi-page `target_deck`) and 46-04 (SRB-03 system-back injection) executed and verified. |
| 47 — CI Matrix Builds for Linux + Mac | — | — | **Cut — deferred to v1.5** | Was predicated on Phase 40 SEA artifacts. |
| 48 — Build and Install Documentation | — | — | **Cut — deferred to v1.5** | Was predicated on Phase 40 SEA artifacts. |
| 49 — Emoji-Selector UX Revamp | 7 | 7 | **Complete** | Original 4 plans (49-01..49-04) shipped 2026-06-06 with verification `passed`. Post-ship amendments 49-05 (clipboardy migration, A1), 49-06 (navigateToDeck addToHistory, A3), 49-07 (core/pagination.ts + Chip migration + noHistory page-to-page nav, A2) shipped 2026-06-07. 27/27 in-scope tests pass on the original 4 plans; 13 new tests added by the amendments all pass with 0 new failures. All EMO-06..14 requirements ✓ Complete. Type rename `emoji-entry-button` → `emoji-emoji-button` documented in CHANGELOG as a breaking change. |

### Phase 40 Cut Rationale (2026-06-05)

- Node SEA's `node --build-sea` flag was Node 23 experimental, never carried into Node 22/24 LTS.
- Real SEA flow on supported Node versions: `node --experimental-sea-config` (generates blob) + `postject` (injects into a copy of node binary). mksnapshot cannot load code with native bindings.
- esbuild `--bundle` on this codebase fails on `x11` (dbus-next media addon), `chromium-bidi` (playwright-core), and similar native-bound paths.
- Even a "slim" sireno-host binary (option 2) has the same constraint — `@elgato-stream-deck/node` is required to talk to the device, and it can't be snapshotted.
- Honest distribution paths: native FFI binary (Rust/Go), Bun compile, or ship the source. None are v1.4 work; all are v1.5 candidates.
- User decision: cut from v1.4, defer to v1.5. v1.4 milestone renamed from "Build, Bundle & UX Polish" to "Addons & UX Polish".

## Milestone History

### v1.3 — Addon Extensibility & Live Hardware
Completed: 2026-06-04
Phases: 10 (30-39)
Key achievements:
- Shared content helpers (Bars, LabelValueList) + bundled system-status / media-player addons
- Truthful `pnpm cli:dev` watch mode with forwarded arguments
- Addon-owned polling with split data/render intervals
- Full Tailwind support as canonical browser utility layer
- Shared command-action contract for tap/hold/double-tap
- Browser-backed hardware decks stay live at ~250ms resampling
- Partial rerender on config/addon source changes
- Startup image fills 100% of device surface on warm beige
- Themable media-player Surface via manifest declaration

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: 1 session
- Total execution time: 1 session

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 — Foundation | 2 | 1 session | 0.5 session |
| 2 — Device + Rendering | 3 | 1 session | 0.33 session |
| 3 — Rich Date-Time Formatting Surface | 3 | 1 session | 0.33 session |
| 4 — Verification and Contract Cleanup | 2 | 1 session | 0.5 session |

**Recent Trend:**
- Phase 1 implementation completed in a single execution pass, with verification catching multiple build/runtime mismatches before handoff.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Phase 56 execution (Plan 56-01):** `getButtonPositionFromLast()` must default `options.keyCount` to 15 (matching `reservedBackKeyIndex`); absence caused `NaN` position for injected system buttons in test environments without explicit keyCount.
- **Phase 56 execution (Plan 56-01):** `handlePress()` must spread existing gesture state (`{ ...gs, holdTimer, holdTriggered: false }`) instead of replacing it whole — otherwise `pendingDblTapTimer` set by a prior release handler is silently destroyed.
- **Phase 56 execution (Plan 56-01):** Overlay-toggle button needs both `onTap` and `onDblTap` handlers (both call `dismissOverlay()`) so double-tap on the reserved slot behaves the same as single-tap during overlay; the system-back button already had `onDblTap` coverage but is replaced by overlay-toggle during overlay.
- **Phase 56 execution (Plan 56-02):** Fixed broken imports in `Bars.test.tsx` and `negative-color.test.ts` where a prior refactor (commit `4aa5f5e`) renamed component files but left stale `../surfaces/Bars` and `../utils/negative-color` paths in the tests. Tests in `__tests__/` directories must use sibling-relative imports, not double-nested paths.
- **Phase 56 execution (Plan 56-02):** Used WMO code 71 instead of 85 for the snow icon test because 85 is not in `WmoIcon.tsx`'s `WMO_MAP` (falls back to `'cloud'`). The test assertion matches the actual map, not an imaginary mapping.
- **Phase 56 execution (Plan 56-02):** Used `createElement` instead of JSX in `brightness.test.ts` (`.ts` extension doesn't support JSX). Other test files in this codebase use `.tsx` extension with JSX or `createElement` for `.ts` files.

- **Phase 1 (v1.0):** Followed recommended standard tooling (pnpm, ESM, strict TS) with tsdown for the CLI build output. Full forward-looking config schema. PID-file daemon lifecycle. pino + colored error UX.
- **Phase 3 execution:** Shared `Text` now owns the strict-whitelist rich-markup grammar (`|`, `*...*`, size tags, tone tags, `<blink>`), always parses string children, keeps invalid markup on full literal fallback, and leaves themes as outer metadata observers only.
- **Phase 3 execution:** Built-in date-time keeps one `format` field and Day.js token engine, preserves markup literal segments during formatting, and relies on shared `Text` for the post-format rich render path.
- **Phase 3 gap closure:** The honest larger-time-line fix uses the existing shared `2xl` token plus a wider shared size ladder; copied size multipliers such as `Chip` must stay in sync with `Text` utilities.
- **Phase 4 discussion:** Keep cleanup scoped to active shipped surfaces, include the unmatched-angle-bracket invalid-markup formatter gap, clean only shipped examples/verification fixtures, and fix only current-phase planning drift.
- **Phase 4 execution:** Built-in `date-time` now preserves malformed unmatched-angle prefixes literally while still expanding useful Day.js tokens, and focused regression coverage proves both formatter-level and mounted shared-`Text` fallback behavior.
- **Phase 4 execution:** Active workflow-routing artifacts now match the completed Phase 3 rerun and live Phase 4 handoff, so verification/state surfaces no longer route operators back into stale rerun steps.
- **Phase 5 discussion:** Treat both live refresh seams as product truth, keep config reload failures on the existing full-deck error surface, add a compact button-facing warning-triangle plus four-digit-code helper for button failures, require deck/button-aware logs, and prefer explicit full reload over magical partial refresh.
- **Phase 5 execution:** `start.ts` now applies successful in-process reloads through one explicit runtime-apply seam, and focused loader/start tests pin the in-process watch graph to config/deck/theme ownership instead of silently claiming addon source edits.
- **Phase 5 execution:** The workspace-root `cli:dev` command is now pinned and documented as the full-process raw-source restart seam, while README guidance explicitly keeps daemon in-process reload scoped to the config-owned graph it already owns.
- **Phase 5 execution:** Button-scoped runtime failures now route through one shared helper with stable `4101`-`4106` codes, compact warning-icon plus code button output, and structured deck/button-aware diagnostics, while config reload failures remain on the separate temporary full-deck error surface.
- **Execution:** Config validation errors must preserve metadata through schema, loader, and formatter layers or the CLI loses file/line/suggestion context.
- **Execution:** yargs command handlers that return promises require `.parseAsync()`, and a foreground daemon must keep the event loop alive explicitly.
- **Phase 5 discussion:** Button behavior should move behind addon-owned stateful instances that render React output, declare their own schemas, and use core-owned scheduling, command helpers, invalidation, and navigation methods.
- **Phase 5 discussion:** Built-in buttons should become bundled addons loaded through the same registry path as external addons, and the button config surface should be redesigned around a core envelope plus inline addon fields.
- **v1.2 research:** Session-aware behavior should be driven by one core-owned normalized context contract shared across config templating, addon render, and command/status execution.
- **v1.2 research:** Background precedence and text fitting need explicit renderer contracts before global wrapper/style primitives are added, or the milestone will turn into per-visual special cases.
- **Phase 11 discussion:** One canonical host context should carry OS `type` / `variant` / `version` plus session capability/state, and that exact shape should be reused across config templating, addon render, and command/status execution.
- **Phase 11 discussion:** Lock-aware behavior should use a top-level runtime/session config setting, allow an ordinary configured locked deck, and otherwise fall back to an implicit built-in date/time locked surface.
- **Phase 11 discussion:** Unlock must restore the full saved pre-lock navigation stack, while locked-mode navigation stays isolated from normal runtime state.
- **Phase 11 discussion:** Unsupported lock detection should not block startup; it should expose unsupported capability in context and warn once.
- **Phase 12 discussion:** Backgrounds stay color-only in this phase and resolve with button override, then deck background, then theme background.
- **Phase 12 discussion:** Text fitting becomes an explicit render contract with `shrink` as the default mode, `wrap` as the alternate mode, and a renderer-owned minimum readable size.
- **Phase 12 discussion:** The new fitting contract lands on shared/default text paths first; bespoke variants should only adopt it where reuse is low-risk.
- **Phase 13 discussion:** Wrapper and style primitives stay separate, are registered through the addon registry, and use global namespaced ids referenced directly as `wrapper_id` / `style_id`.
- **Phase 13 discussion:** Config-authored refs fail in config validation, addon-authored refs fail before rendering, missing providers hard-fail as unknown refs, and Phase 13 validation only checks existence plus wrapper/style kind.
- **Phase 13 discussion:** The first primitive rollout stays on the shared/default button path, keeps explicit props like `background` and `fit` authoritative, and must prove cross-boundary reuse with at least one bundled primitive consumer.
- **Phase 13 execution:** Wrapper/style primitives now live in the addon registry as separate namespaced definitions, and bundled addons register the same primitive contracts external addons use.
- **Phase 13 execution:** Config-authored primitive refs fail early with path-aware loader diagnostics, while addon-authored render refs fail before image generation through runtime-side validation.
- **Phase 13 execution:** Shared/default rendering consumes primitive-backed defaults without overriding explicit `background` and `fit`, and the repo now ships focused tests plus a committed Phase 13 review fixture for cross-boundary primitive reuse.
- **Phase 14 discussion:** Built-in toggles should ship as one `toggle` type with explicit `mode: internal | get-set | toggle-status`, shared base presentation plus per-state overrides, and no separate per-mode button types.
- **Phase 14 discussion:** Command-driven toggles are externally authoritative: `toggle-status` requires `status_command`, startup stays pending until the first read, failed writes preserve last authoritative truth plus error state, and output mapping uses explicit `on_values` / `off_values` token lists.
- **Phase 14 discussion:** Toggle visuals may differ by mode, but only through shared-base mode accents rather than three bespoke renderers; internal toggle state continuity remains scoped to the running daemon, not durable restart persistence.
- **Phase 30 discussion:** Shared `Bars` and `LabelValueList` should ship as public component-first TSX surfaces, `LabelValueList` should auto-select its 1/2/3-4 line layout from line count, and helper components should stay mostly presentation-only with formatting owned by callers or built-ins.
- **Phase 30 discussion:** The built-in system-status addon should use a canonical cross-platform metric catalog with honest per-OS unavailable states, helper-template-driven button configs, metadata-only overrides, and optional tap/hold actions rather than a generic layout DSL.
- **Phase 30 discussion:** The built-in media-player button should require truthful play/pause/stop state, use best-effort title/artist/app/progress metadata, reuse shared `Text` marquee for overflow, keep tap fixed to play/pause, and expose only optional hold configuration beyond that.
- **Phase 31 discussion:** `cli:dev` stays the external `tsx watch` raw-source restart seam, bare `pnpm cli:dev` should still launch `start --config config.yml`, and forwarded args such as `pnpm cli:dev emulate --port 8912` must reach the real CLI entrypoint truthfully without widening the dev workflow.
- **Phase 31 execution:** The workspace-root `cli:dev` seam now routes through a narrow `dev-watch` launcher that keeps the existing `tsx watch` include graph, restores bare `start --config config.yml` behavior, and passes forwarded subcommand args through untouched to the real CLI entrypoint.
- **Phase 31 execution:** The shipped `start.test.ts` regression seam and README refresh section now match the repaired launcher contract, covering both bare `pnpm run cli:dev` and forwarded invocations such as `pnpm run cli:dev emulate --port 8912` without redefining the narrower in-process reload seam.
- **Phase 31 gap closure:** Theme runtime imports now stay on the real source path with `tsx` cache-busting instead of temp snapshot copy/delete churn, so the watched emulator seam no longer self-invalidates on `.sireno-theme-runtime-*` unlink events. The remaining bare-path cleanup defect stays scoped to Plan `31-04`.
- **Phase 31 gap closure:** `startDaemon()` cleanup now honors the real `SessionMonitor.stop(): Promise<void> | void` contract by tolerating synchronous stops, and the Phase 31 UAT/verification artifacts now preserve the original failed reports while recording that `31-03` and `31-04` closed the underlying runtime defects.
- **Phase 31 rerun closure:** The live worktree `cli:dev` seam is now re-pinned to the same verified root-script and launcher contract the phase originally shipped, including the `pnpm exec tsx watch` wrapper, the full include graph, and the narrow `--` sentinel normalization in `dev-watch.ts`, so rerun attempt 3 can exercise the real restored seam instead of dirty local drift.
- **Phase 31 shell closure:** The workspace-root `cli:dev` script now quotes its `tsx watch --include` globs so zsh no longer aborts on missing repo-root patterns before the launcher/runtime seam starts, and the shipped root-script regression plus preserved UAT history now pin that shell-safe contract explicitly.
- **Phase 32 discussion:** Core runtime should stay capability-agnostic (scheduling/store/methods/render transport only), while system/media capability types, polling/data callbacks, mappers, and OS adapters move into addon-owned modules.
- **Phase 32 discussion:** Polling contract should support split data vs render intervals with addon-owned schema validation/defaults, and callback-returned typed payloads should be passed into render props by core.
- **Phase 32 discussion:** Migration strategy is a big-bang ownership move with strong regression proof gates rather than long-lived compatibility facades.
- **Phase 33 discussion:** Full Tailwind support means real Tailwind integration with Tailwind as the canonical browser utility layer, a hard cut for shared/core UI, and truthful config/build/watch tooling instead of a larger handwritten Sireno utility sheet.
- **Phase 33 discussion:** Sireno theme resolution stays authoritative through the Tailwind bridge, the full resolved browser theme contract should remain available to utilities, shipped color/typography styling stays Sireno-token-backed, and dynamic class needs require an explicit safelist-generation contract rather than runtime compilation magic.
- **Phase 34 discussion:** Shared command-action behavior should standardize on a public nested `commands.tap | hold | double-tap` contract plus a reusable schema/interface and narrow gesture-handler hook, with partial gesture support allowed and `double-tap` suppressing `tap` when both are configured.
- **Phase 34 discussion:** Migrate all command-capable built-ins except `media-player` onto the shared contract, expose the optional command-action config across all regular `date-time` buttons except locked tiles, keep `media-player` internal-only, await command execution, and avoid adding automatic invalidation or a second failure UX.
- **Phase 34 execution:** `packages/cli/src/addon/api.ts` and the package root now publish one shared nested `commands` schema plus `useButtonActionCommand(...)`, and the bundled `action` button proves awaited tap/hold/double-tap command behavior without widening `deck/runtime.ts` or auto-invalidating buttons.
- **Phase 34 execution:** System-status and the full regular date-time button family now reuse the shared command-action contract, while `media-player` and locked date-time tiles remain on their separate bounded seams and focused addon regression tests prove the migration boundaries.
- **Phase 35 discussion:** Keep the live browser-page resampling loop inside `browser-renderer.ts`, make physical hardware browser decks stay live by default at roughly 250ms, capture immediately on fresh HTML changes, keep hardware transport on per-key deduped writes, and let shared blink/marquee start updating on hardware as a consequence of the broader browser-backed deck scope.
- **Phase 35 planning:** Execute the feature in two tracer bullets: first make browser-backed hardware decks stay live end-to-end without reloading unchanged HTML, then harden that live seam across startup placeholder, capture failure, reconnect, and runtime replacement edges.
- **Phase 33 execution:** Plan `33-01` replaced the handwritten browser utility generator with a real Tailwind browser asset build, kept Sireno theme vars authoritative, and narrowed `theme-utilities.ts` to Tailwind asset loading plus product-only runtime glue.
- **Phase 33 execution:** Browser and emulator delivery now use explicit split stylesheet seams (`data-sireno-tailwind`, `data-sireno-runtime`, `data-sireno-theme-assets`) instead of the legacy `data-sireno-theme-utilities` contract, with focused regression proof on the shipped browser/emulator paths.
- **Phase 30 execution:** The shared helper surface now ships as public `Bars` and `LabelValueList` TSX components from the package root, with runtime-enforced count bounds and `LabelValueList` auto-layout still kept presentation-only.
- **Phase 30 execution:** The bundled `system-status` addon now loads through the real shipped registry with `system-status-bars` and `system-status-label-values`, backed by one canonical metric catalog, a bounded numbro-backed display mapper, explicit unavailable slots, and button-local tap/hold handling that does not widen runtime semantics.
- **Phase 30 execution:** The bundled `media-player` addon now loads through the real shipped registry on top of a shared media-controller seam, uses a real Linux `playerctl` adapter, keeps macOS and Windows explicitly unsupported until verified, reuses `Bars` and shared `Text` marquee, and keeps tap fixed to play/pause with optional hold behavior implemented locally inside the button seam.

### Pending Todos

- Decide whether to normalize planning docs that still mention `tsup` now that the codebase uses `tsdown`.
- Run `/review` on the completed Phase 5 closure pass, then continue with `/ship` and `/compound` once review is clean.
- Run `verify-work 30` for the committed manual UAT pass, then continue with `/review`, `/ship`, and `/compound`.
- Run `verify-work 32` for a fresh manual UAT pass on addon-owned polling payload flow, split cadence behavior, and migrated built-in system-status/media-player paths.
- Run `verify-work 34` for a fresh manual UAT pass on action-button, system-status, and regular date-time tap/hold/double-tap command behavior plus locked-tile/media-player boundary checks.

### Roadmap Evolution

- Phase 67 added: settings deck layout revamp (v1.6 gap closure) — reorder brightness controls to n-3/n-2/n-1, pin logo+version at position 0, refactor brightness buttons to use `IconLabelSurface` (resolving the `iconTextSurface` misreference), and use `Label` for the percent display per SETTINGS-07.
- Phase 66 added: SplitActionSurface — replace SystemBackButton, SystemBackWithPendingOverlayButton, and SystemSettingsEntryButton badge pattern with a reusable dual-action surface component
- Phase 49 added: emoji-selector UX revamp as a v1.4 late addition — rewrite based on real-world feedback (real emoji glyphs not U+1Fxxx placeholders, bigger key art, HID keyboard-stroke output for tap=emoji / double-tap=shortcode, proper subcategory split using the piliapp.com catalog, n-2 page-nav button with Tap/Dbl-Tap chip hints, addon-provided entry button that renders a 2×3 grid of six emojis as a first-class button type).
- Phase 39 added: let external themes override the `Surface` component used by the built-in media-player addon so they can render the button surface however they want.
- Phase 48 added: document the build and install flow for the v1.4 standalone binary — README updates for end-user install of the prebuilt binary, plus developer quickstart for building from source.
- Phase 38 added: make the Stream Deck startup image cover 100% of the device surface instead of being centered.
- Phase 37 added: reload only the affected buttons in watch mode when config or addon JSX/TSX/CSS source files change, instead of restarting the full app.
- Phase 36 context captured (discuss-phase): remove marquee from TextFit, migrate media-player to ellipsis, narrow theme frame contract.
- Phase 36 added: remove the text marquee overflow mode because it requires very frequent rapid updates that are too expensive to sustain.
- Phase 35 added: keep browser-rendered animated button surfaces live on physical Stream Deck hardware by resampling the mounted deck surface at roughly 250ms cadence without restarting the page on every frame.
- Phase 34 added: create a common interface addon buttons can optionally implement to handle button-action system commands (`tap`, `hold`, `double-tap`) through a shared schema and hook, refactoring action-button and date-time buttons onto the pattern while keeping media-player internal.
- Phase 33 added: add full Tailwind support.
- Phase 32 added: move addon-specific polling/data-fetching logic out of core system modules into addon-owned callbacks so core only schedules intervals, passes command output props to render, and publishes rendered frames.
- Phase 31 added: make `pnpm cli:dev ...` start the real CLI watch mode and honor forwarded command arguments such as `emulate --port 8912`.
- Phase 5 added: restore hot refresh when config or React files change, and add a shared button error helper that renders a warning triangle plus a four-digit error code while logging richer deck/button-aware diagnostics.
- Phase 30 added: add shared content helpers for bar and label-value button layouts, then ship configurable built-in system-status and media-player addons backed by platform-specific metric and media-control adapters.
- Phase 29 added: remove remaining legacy seams such as `LegacyAddonButtonDefinition`, stop using `createElement` in favor of JSX/TSX, prefer Tailwind utilities over inline styles except where impossible, split built-in multi-button addons into one button per file, and decide between `dayjs` and `momentjs` for the date-time button formatting path.
- Phase 28 added: move toward JSX/TSX component-first rendering, replace `createDomIcon`-style helper rendering with components, use tailwind-style classes plus `cn` where possible, add a workspace-root `p cli:dev` watch mode that runs the CLI through `tsx`, and provide theme-customizable utility components such as `Icon`, `Chip`, and `Text`.
- Phase 27 added: remove the legacy YAML theme fallback, use the built-in default theme `ButtonFrame.tsx` as the only frame fallback, stop requiring manual `import React from 'react'` in TSX runtime files, ensure theme `ButtonFrame.tsx` edits trigger autoupdate, and show deck glass chrome only in emulator mode.
- Phase 26 added: refactor the browser deck shell onto React/TSX components, emulate Stream Deck button spacing/glass chrome in browser mode, keep undersized virtual-device selections renderable with a persistent warning, and use `assets/logoFull.png` as a startup mosaic while the browser renderer boots.
- Phase 25 added: themes can provide `buttonFrame` as `.tsx` modules too, not only `.js`, so theme-owned frame rendering can follow the authoring path prepared in `themes/default`.
- Phase 23 added: allow JSX/TSX addon button authoring and show a startup image on the Stream Deck before the browser path sends the first deck surface.
- Phase 24 added: replace the instance-first addon button contract with a mounted active-deck React render model, definition-level runtime handlers, and a core-owned addon store that survives deck changes for one runtime session.
- Phase 22 added: browser deck emulator
- Phase 21 added: theme fonts must be shipped as real bundled assets so browser-rendered typography does not depend on missing host fonts or broken theme font references.
- Phase 20 added: theme packages with manifest-backed assets and theme-owned button frames, external image rendering fixes, and a centered five-button locked time layout.
- Phase 19 added: tailwind-backed button theming wired through Sireno theme CSS variables so browser-rendered surfaces can use utilities like `text-primary` against the active global theme.
- Phase 16 added: config hot-reload, external deck-file references, wrapper label removal, and customizable wrapper accent colors.
- Phase 17 added: custom wrapper primitives with addon-authored rendering variants.
- Phase 18 added: React DOM-based renderer with HTML/CSS surface support, including richer media such as GIFs and video.
- Phase 16 executed: deck-only `@path` references, watched config graph reloads, shared-wrapper footer removal, narrow `accent` overrides, and runtime-owned invalid-reload fallback are all implemented and verified.

### Progress Notes

- **Phase 67 discussion:** Locked the settings deck revamp around a dynamic `keyCount`-aware layout: position 0 holds `__sireno_internal_settings_logo_version` (resolving the SETTINGS-05/SETTINGS-06 n-1 contradiction by rephrasing SETTINGS-06 to "position 0"), and n-3/n-2/n-1 hold `brightness_down`/`brightness_up`/`current_brightness`. The `iconTextSurface` reference in SETTINGS-05 is a misnamed pointer to the existing `IconLabelSurface` primitive (25 lines, theme-overridable via `useThemeUiPresentation().surfaces.iconLabel`, exported from `ui/index.ts`); brightness buttons refactor to `<IconLabelSurface icon="sun|moon" label="Brighter|Dimmer" />`. `current_brightness` refactors to `<Label>` for both `{N}%` and the "Brightness" subtitle per SETTINGS-07. `logo_version` keeps its hand-rolled text render (no icon, stays text-only). The static `INTERNAL_SETTINGS_DECK` constant in `runtime.ts:267-292` is replaced by a `createInternalDecks(keyCount)` call; test assertions and addon manifest button order updated. The standalone `brightness` user-installable addon (`packages/cli/src/builtin-addons/brightness/`) is out of scope. Canonical references: `67-CONTEXT.md`, `67-DISCUSSION-LOG.md`.

- **Phase 31 discussion:** Kept the phase narrow to restoring the truthful root `cli:dev` contract: default `start --config config.yml` behavior plus real forwarded subcommand args on the external `tsx watch` seam, with docs/tests/script kept in sync.

- **Phase 31 execution:** Completed Plan `31-01` by replacing the broken raw-entrypoint `cli:dev` script with a narrow `dev-watch` launcher, keeping `tsx watch` as the external full-process seam, defaulting bare runs to `start --config config.yml`, and adding focused argv-resolution regression coverage.

- **Phase 31 execution:** Completed Plan `31-02` by updating the shipped `start.test.ts` root-script regression to match the launcher-based contract and documenting the forwarded `pnpm run cli:dev emulate --port 8912` path in README without widening the watch-mode workflow.

- **Phase 31 verification:** Verified the repaired `cli:dev` seam end-to-end with focused launcher tests, the shipped root-script regression, and grep proof that `package.json`, `dev-watch.ts`, and README all describe the same bare-plus-forwarded contract.

- **Phase 31 gap closure:** Completed Plan `31-03` by removing theme runtime temp snapshot churn from the watched startup seam, proving repeated built-in theme loads no longer create new `.sireno-theme-runtime-*` temp entries, and pinning the exact watched emulator path so it starts once without self-triggering restart-loop logs.

- **Phase 31 gap closure:** Completed Plan `31-04` by hardening the bare `startDaemon()` cleanup path against synchronous `sessionMonitor.stop()` behavior and updating the preserved UAT/verification history so rerun work now points directly at the two gap-closure plans that fixed the runtime seam.

- **Phase 31 rerun closure:** Completed Plan `31-05` by restoring the live root `cli:dev` script and `dev-watch` launcher back to the verified contract, preserving only the required `pnpm` `--` sentinel normalization, and pointing the remaining bare-path rerun gap at the live-seam restoration rather than the already-closed runtime defects.

- **Phase 31 shell closure:** Completed Plan `31-06` by shell-proofing the root `cli:dev` watch command for zsh, tightening the shipped root-script regression around quoted include globs, and pointing the remaining rerun history at the shell-safe root-script closure before the final manual UAT rerun.

- **Phase 32 discussion:** Locked addon-owned polling/data ownership with core as a capability-agnostic scheduler/transport seam, split data/render interval support, callback payload handoff into render props, addon-local OS adapters, and a deliberate big-bang migration strategy.
- **Phase 33 discussion:** Locked Phase 33 around real Tailwind adoption for the browser-rendered surface, a prebuilt Tailwind stylesheet asset plus Sireno-specific runtime CSS glue, first-class workspace support for core/shared UI plus built-ins/theme TSX/local addons, and a truthful `pnpm cli:dev` seam for Tailwind changes.
- **Phase 34 discussion:** Locked Phase 34 around a public addon-facing shared command-action schema/interface and hook, one shared hold threshold plus double-tap suppression semantics, a hard-cut migration for every command-capable built-in except `media-player`, and a broadened `date-time` rollout covering all regular button types except locked-session tiles.
- **Phase 33 execution:** Completed Plan `33-01` by adding a real Tailwind v4 browser stylesheet build for the CLI package, keeping Sireno token/runtime glue ownership narrow, and splitting browser/emulator stylesheet delivery into explicit Tailwind/runtime/theme-asset seams with focused regression coverage.

- **Phase 30 discussion:** Locked the new helper surface to public component-first `Bars` and `LabelValueList` components, bounded system-status around canonical metric adapters plus helper-template buttons with honest unavailable states, and bounded media-player around truthful status, best-effort metadata, shared marquee overflow, fixed tap play/pause, and optional hold behavior.

- **Phase 30 execution:** Completed Plan `30-01` by publishing `Bars` and `LabelValueList` on the public TSX surface, adding focused helper tests, and proving `Bars` through the shipped mounted `media-sample` built-in path.

- **Phase 30 execution:** Completed Plan `30-02` by expanding `live-metrics.ts` into a canonical system metric seam, adding the bounded `system-status.ts` formatter/mapping layer, shipping bundled `system-status-bars` and `system-status-label-values` buttons, and proving honest unavailable slots plus button-local tap/hold behavior through the shipped addon registry path.

- **Phase 30 execution:** Completed Plan `30-03` by shipping the shared media-controller seam, a Linux `playerctl` adapter with honest best-effort metadata/progress parsing, explicit unsupported macOS/Windows adapters, and a bundled `media-player` button that proves fixed tap play/pause, optional hold behavior, shared-helper progress, and shared marquee overflow through the real addon registry path.

- **Phase 3 discussion:** Re-scoped the phase from a bounded date-time-only formatter into a shared `Text` mini markup language with strict whitelist nesting, existing tone-token tags, shared size tags, structural `|` line breaks, CSS-only blink, Day.js-first then `Text` parsing, and literal fallback for any invalid markup.

- **Phase 3 execution:** Shipped the shared `Text` strict-whitelist rich-markup parser/render seam, added narrow utility CSS plus DOM-host regression proof, preserved markup literals around Day.js token expansion in the built-in date-time formatter, replaced the Phase 22 review fixture with a real rich date-time emulator path, and recorded the always-on blink tradeoff explicitly in Phase 3 UAT and verification.

- **Phase 3 gap closure:** Fixed the real UAT size-contrast miss by moving the committed date-time review path and mounted proof onto shared `2xl`, widening the global text size ladder, and syncing `Chip` with the updated `sm` multiplier so the theme seam stays truthful.

- **Phase 4 discussion:** Locked the final milestone phase around truthful cleanup only: active shipped tests/fixtures/examples/docs, the unmatched-angle-bracket invalid-markup gap in the built-in date-time formatter, shipped-example-only fixture normalization, and current-phase planning-state drift rather than archive-wide cleanup.

- **Phase 4 execution:** Closed the unmatched-angle invalid-markup formatter gap without widening the date-time contract, added focused raw/mounted regression coverage for that edge case, reconciled stale Phase 3 verification text with the already-passed rerun UAT, and moved the project handoff onto truthful Phase 4 verification state.

- **Phase 5 discussion:** Locked the next phase around both existing hot-refresh seams (`tsx watch` plus in-process reload), preserved the current full-deck config-error path, scoped the new shared error helper to button-facing failures, required deck/button-aware diagnostics, and chose explicit full reload as the default refresh truth.

- **Phase 2 execution:** Replaced the fake shrink clamp with a browser-only shrink-fit helper shared by browser capture and emulator paths, kept mounted/static output on honest ellipsis fallback, shipped a committed Phase 22 shrink-fit review addon/fixture/UAT path, and fixed the emulator shutdown seam so the review command closes cleanly when `sessionMonitor.stop()` is synchronous.
- **Phase 2 discussion:** Locked shrink-fit as a browser-only live measurement seam on canonical `Text`, removed the CSS clamp as primary logic, kept measurement limited to `fit="shrink"`, chose fixed `ellipsis` fallback after the readable floor, deferred configurable fallback/floor API, and required content/container/theme-metric remeasurement plus aggressive loop guards and browser-path regression proof.
- **Phase 1 execution:** Shipped the theme-relative typography contract by moving final sizing onto shared `Text` tokens, exposing size metadata through the default theme presentation seam, sweeping shipped raw typography callers onto explicit `Text` semantics, and updating focused regressions plus the live date-time test contract to the honest single-`format` surface.
- **Phase 1 discussion:** Locked the typography contract around role-base variables plus shared `Text` scaling, fixed-core moderate size multipliers with `md` as the exact role base, theme wrappers as observe-only metadata consumers, a repo-wide raw typography sweep with `Text` preferred for real text nodes, and explicit regression guardrails against implicit role-class sizing.
- **Milestone v1.2 shipped:** `complete-milestone` archived the live roadmap and requirements into `.planning/milestones/v1.2-ROADMAP.md` and `.planning/milestones/v1.2-REQUIREMENTS.md`, collapsed the active roadmap into milestone history, and tagged the release as `v1.2`.
- **Milestone closeout reconciliation:** Quick task 019 reconciled the stale v1.2 draft claims, backfilled the missing `23-05` summary, reconstructed truthful Phase 17 and Phase 21 closure artifacts, and left the planning layer ready for a clean `complete-milestone` rerun.
- **Phase 29 completion:** All three Phase 29 slices are executed, summarized, verified, reviewed, shipped, and compounded.
- **Phase 29 discussion:** Locked a hard cut that removes `LegacyAddonButtonDefinition` plus the runtime `createInstance()` bridge, requires one built-in button definition per file with local shared support files allowed, treats simple inline built-in styles as utility-layer debt to eliminate, and standardizes built-in date/time formatting on `dayjs` with Day.js token syntax. Richer date-time formatting ideas raised during discussion were explicitly kept out of scope and noted for future roadmap backlog work.
- **Phase 28 execution:** Closed Wave 1 and Wave 2 with the public component-first `Icon`/`Chip`/`Text` kit, theme presentation seam, core-button/runtime fallback migration, and the hard authoring cut that removed helper exports from the shipped addon surface, tests, fixtures, and docs. Wave 4 now adds the truthful workspace-root `cli:dev` watch loop on `tsx watch ... start --config config.yml` plus final changelog/state learnings.
- **Phase 28 completion:** All four plan slices are now executed and summarized, `28-VERIFICATION.md` passes with focused source/runtime/script proof, and the next workflow step is `verify-work 28` followed by `/review`, `/ship`, and `/compound`.
- **Phase 28 discussion:** Locked Phase 28 around a hard cut from helper-factory rendering to component-first TSX authoring, a core-owned but theme-presentable `Icon`/`Chip`/`Text` kit, `Text` as the new canonical fit/marquee/ellipsis/wrap contract with auto-animating overflow marquee, a workspace-root `p cli:dev` loop that runs the real `tsx`-driven `start --config config.yml` seam, and one `Icon` API backed by Lucide plus Simple Icons.
- **Phase 27 discussion:** Locked the phase around deleting the legacy YAML theme path, moving fallback frame ownership to the built-in default theme package, fixing the real TSX runtime seam so `.tsx` runtime modules no longer need manual `React` imports, keeping `themes/default/ButtonFrame.tsx` inside the truthful watched reload graph, and restricting deck glass chrome to emulator mode only.
- **Phase 27 gap closure:** Added a minimal workspace-root TSX policy anchor so the repo-root raw-source CLI startup command inherits the same JSX behavior as the package runtime, replaced the neighboring package-root proof with a regression on the exact `pnpm exec tsx packages/cli/src/cli/index.ts ...` seam, reran the blocked legacy-YAML theme check, and updated the UAT/verification artifacts so the original blocker evidence remains inspectable through `27-03-PLAN.md`.
- **Phase 27 execution:** Removed the legacy YAML theme branch, deleted the core-owned fallback frame seam in favor of the built-in default theme package runtime, kept the built-in theme runtime graph truthful for watched reloads, gated browser shell chrome to emulator-only output through explicit render intent, fixed raw theme/addon TSX execution by passing the package `tsconfig.json` into `tsx`, and committed the emulator deck-root patcher fix so stale inline warnings do not survive HTML updates.
- **Phase 27 planning:** Broke the phase into two tracer bullets: theme-contract cleanup first by deleting `legacy_yaml`, moving fallback frame ownership onto the built-in default theme package, and proving `themes/default/ButtonFrame.tsx` stays in the watched reload graph; then browser-shell/runtime truthfulness second by gating glass chrome to emulator mode only and proving the real `tsx` execution path no longer needs manual React-import boilerplate in touched runtime TSX files.
- **Phase 26 execution:** Moved the browser deck onto one shared React document tree with an honest JSX button frame, moderate shell chrome, and explicit empty wells; changed undersized virtual-device handling from a hard error page to visible subset plus persistent inline warning inside the shared shell; and replaced the repeated startup tile with a pre-browser `logoFull.png` deck-wide placeholder treatment that still hands off on the original hardware/startup seam.
- **Phase 26 discussion:** Chose to make the whole browser deck document a shared React tree for both browser capture and emulator mode, changed undersized virtual-device handling from a hard error page to a rendered visible subset plus persistent inline warning, scoped shell polish to moderate Stream Deck-style bezel/gap/glass treatment, and kept startup loading on the existing pre-browser seam with a simple `assets/logoFull.png` loading card instead of a React-owned mosaic.
- **Quick task 016:** Aligned the stale dom-host and emoji-selector browser asset assertions with the live absolute-path HTML contract and restored the committed Phase 23 local raw addon fixture to the current runtime shape (`createInstance() -> { render() { ... } }`) using explicit `createElement(...)`, which closed the three focused blockers from the aborted full-branch ship run.
- **Phase 25 execution:** Switched manifest-backed theme runtime loading onto the same fixed-policy `tsx` import seam already used for raw addons while preserving tolerant `buttonFrame` exports and fresh reloads, updated the shipped default-theme proof path to the real `index.ts` plus `ButtonFrame.tsx` graph, and added committed custom `.tsx` theme fixtures plus explicit import-boundary failures when a runtime graph escapes the theme package root.
- **Phase 25 discussion:** Kept `manifest.main` as the only theme runtime entrypoint while allowing `.js/.jsx/.ts/.tsx`, applied that same contract to both built-in and custom manifest-backed themes, preserved tolerant `buttonFrame`/`ButtonFrame` export lookup, and constrained theme runtime relative imports to stay within the theme package root.
- **Phase 23 discussion:** Captured a narrow local-addon raw-source contract (`sirenoAddon.main` may point at `.ts/.tsx/.js/.jsx`), kept the public authoring API on the root export only, and chose a branded temporary startup placeholder that clears on first real render and never hides honest browser startup failures.
- **Phase 24 discussion:** Re-scoped the phase from a narrow direct-render cleanup into a runtime-contract migration: Node keeps hardware/event ownership, the active deck becomes a persistent mounted React tree while active, inactive decks unmount on navigation, button definitions expose definition-level runtime handlers plus `render(props)`, and core provides button-local plus addon-wide session store access without adding cross-restart persistence.
- **Phase 24 planning:** Broke the migration into four execution slices: explicit contract compatibility first, core-owned addon session store second, mounted active-deck root and transient runtime props third, and built-in/doc/fixture truthfulness last. Phase 24 is a post-roadmap follow-on and does not introduce new v1.2 requirement IDs.
- **Phase 24 execution:** Shipped the mounted addon button contract and compatibility adapter, added the runtime-owned addon session store, mounted the active deck as a Node-side React host that preserves local state while active and unmounts on deck exit, migrated shipped built-ins onto `defineMountedButton(...)`, extended the committed Phase 24 fixture to prove store coordination plus transient runtime props, and updated architecture docs so they match the live mounted runtime.
- **Phase 24 gap closure:** Fixed the two verify-work emulator gaps without changing the runtime ownership boundary: emulator-served mounted assets now go through browser-loadable HTTP URLs instead of broken `file://` paths, and the emulator page now patches the existing deck root by key instead of replacing the whole `#deck-mount` subtree on each poll-driven render.
- **Phase 24 final rerun closure:** Preserved the mounted deck's theme utility and theme asset styles on the emulator transport, rewrote emulator-served theme font URLs to browser-loadable `/__sireno/assets?path=...` endpoints, and closed the last rerun UAT failure without regressing the earlier asset-serving or keyed patching fixes.
- **Phase 24 final closure:** Stopped config validation from baking rewriteable addon/theme asset refs into `file://...` URLs, which let config-expanded emoji deck icons flow through the existing emulator HTTP asset route and close the last rerun UAT failure.
- **Phase 23 planning:** Broke the phase into two execution slices: manifest-driven local raw-source addon startup through the normal CLI path, and a branded physical-device startup placeholder that hands off cleanly to the first real browser capture.
- **Plan 23-01:** Shipped local raw-source addon loading through `sirenoAddon.main` for local `.ts/.tsx/.jsx` entries using `tsx`, bounded the relative source graph to the addon root, committed a raw `.tsx` fixture addon, and proved the normal startup config path loads it through the root export surface only.
- **Plan 23-02:** Shipped branded hardware startup placeholder buffers, wired the placeholder into `startDaemon()` before the first real browser capture, documented the hardware review path, and locked write-order / handoff / failure-cleanup behavior in focused startup tests.
- **Plan 23-03:** Closed the shipped fixture config drift by changing the sample config to `phase-23-local-raw-button`, added focused startup/config coverage for the real Phase 23 fixture config, and preserved the original failed UAT evidence with an explicit rerun path.
- **Plan 23-04:** Restored the shipped raw fixture entrypoint to the helper-based render contract, added focused startup/runtime coverage for real renderable output, and preserved the rerun `React is not defined` evidence with an explicit rerun path.
- **Phase 23 verification:** Confirmed all four Phase 23 slices with focused loader/startup tests (`PASS (28) FAIL (0)`), including root-export-only raw `.tsx` addon startup, hardware placeholder handoff/cleanup behavior, the corrected shipped sample-config seam, and the restored helper-based fixture render contract.
- **Phase 20 planning:** Broke the phase into three verified vertical slices: theme package resolution plus theme-owned browser frame first, shared theme/addon asset pipeline second, and the centered implicit locked `HH:MM` fallback third.
- **Phase 22 discussion:** Chose a real-runtime virtual-device emulator, mouse-driven press/release semantics with visible press/hold states, in-page device selection with restart-on-change, clear emulator-specific layout errors, and an explicit CLI mode serving one local deck-focused page.
- **Phase 22 execution:** Shipped `sireno emulate`, a virtual Stream Deck lifecycle, a local browser emulator page, runtime-owned `down` / `up` input bridging with visible pressed-state feedback, explicit supported virtual devices, restart-on-change behavior, and an emulator-specific mismatch error surface.
- **Phase 21 discussion:** Kept theme fonts CSS-native through `@font-face`, preserved hard failures only for missing stylesheet/font asset files, allowed silent browser/system fallback for unresolved family names, and required focused tests plus one committed browser fixture proving a packaged custom font visibly affects rendered text.
- **Phase 20 discussion:** Captured the shift from single-file themes to manifest-backed theme packages with required runtime entries, theme-owned `buttonFrame` chrome with explicit `idle/tap/hold` state, manifest-declared bundled assets with CSS-relative URL rewriting, a general external asset-pipeline fix, and a fixed five-button implicit locked-time fallback.
- **Plan 20-01:** Shipped async manifest-backed theme resolution, package-backed built-in theme aliases, and theme-owned browser `buttonFrame` rendering with a committed review fixture.
- **Plan 20-02:** Shipped the shared package-root asset pipeline for `builtin://` and `addon://` assets, theme stylesheet/font injection with CSS-relative URL rewriting, and a committed shared-asset review fixture.
- **Plan 20-03:** Replaced the implicit single-button lock surface with a centered live `HH:MM` row on buttons `5..9`, preserved explicit `session.locked_deck` authority plus unlock restore behavior, and added the committed locked-time review fixture.
- **Phase 16 execution:** Shipped deck-only file references through the existing loader contract, active config-graph watching with rebuild-and-restore reload semantics, shared-wrapper footer removal plus explicit per-button accent overrides, and a runtime-owned temporary error deck for invalid reloads.
- **Plan 16-05:** Closed the Phase 16 UAT startup blocker by making theme resolution config-owned, fixing the watched root-plus-ref file graph, and wiring the diagnosed gaps to a rerun-ready closure plan.
- **Plan 16-06:** Made shared/default accent overrides visibly affect shared card chrome, reran the final UAT check, and finished Phase 16 verification.
- **Phase 17 discussion:** Captured the shift from wrapper ids to a default base button-shape model, explicit full-surface opt-out, and narrow explicit content helpers while keeping bespoke variants on their current seams for now.
- **Phase 17 planning:** Broke the phase into three slices: contract and compatibility first, core base-shape plus helper extraction second, and reviewable default-vs-full-surface proof third.
- **Plan 17-04:** Closed the Phase 17 UAT regression by forwarding `full_surface` through the shipped CLI/device render path, preserving config-authored surface metadata across builtin runtime re-renders, and passing the real-device rerun.
- **Phase 18 discussion:** Captured the hard switch to browser-backed HTML/CSS button rendering, one persistent deck page, sampled media rendering, latest-state capture coalescing, and a core-owned React `buttonFrame` that wraps by default unless `full_surface: true`.
- **Phase 18 context refresh:** Clarified that button authors write normal React TSX and `react-dom` performs the HTML/CSS conversion; the custom `deck-button`-style authoring path is not the Phase 18 target.
- **Phase 16 discussion:** Captured deck-only file references with owning-file-relative path resolution, root-plus-ref hot-reload, built-in temporary error-deck fallback on invalid reload, stack-preserving successful reload restore, full runtime instance rebuild on reload, shared-wrapper footer removal, and narrow per-button accent overrides accepting tokens or raw colors.
- **Phase 10 kickoff:** Milestone audit found that the documented addon authoring entrypoints do not line up with the built `packages/cli` exports, so release flow needs a gap-closure phase before `/review`.
- **Milestone v1.2 kickoff:** Captured session-context, layered background, text fitting, global wrapper/style, richer toggle, and lock-aware deck requirements plus the five-phase roadmap that sequences contract work before user-facing polish.
- **Phase 11 discussion:** Captured the canonical host/session contract, first minimal config templating seam, implicit built-in locked fallback, isolated lock-mode navigation, and unsupported-host degradation policy for downstream planning.
- **Plan 05-01:** Completed the addon API, bundled registry, bootstrap-aware config validation, and the first generic addon-host runtime slice.
- **Plan 05-02:** Completed addon manifest validation, unified local/npm loading, startup warning isolation, and external-addon regression coverage.
- **Plan 05-03:** Completed addon asset resolution, deck-type expansion, and the bundled emoji selector proof with runtime coverage.
- **Plan 05-04:** Replaced stale shipped local/npm addon examples with disabled illustrative declarations so the repo no longer claims nonexistent addons are ready to run.
- **Plan 05-05:** Fixed SVG addon icon composition in the renderer and switched emoji-entry tiles to deterministic ASCII-safe visuals that do not depend on host emoji fonts.
- **Plan 05-06:** Clarified disabled addon semantics in the shipped config and pinned the skip-vs-warning contract in loader/startup tests.
- **Plan 05-07:** Realigned bundled SVG assets with the icon-slot contract and strengthened renderer verification around icon-region pixels.
- **Plan 05-08:** Restored image-backed emoji tiles for the bundled emoji selector with bundled per-emoji assets and fallback coverage.
- **Phase 5 re-discussion:** Captured follow-on context for typed JSX addon authoring, core-owned live update defaults plus `interval_ms` overrides, optional shared button wrapper/text helpers, full theme typography tokens, and separate `analog-clock` / `calendar-sheet` button types inside the built-in date-time addon.
- **Plan 08-01:** Shipped the first Phase 8 analog-clock tracer bullet end-to-end, including the separate bundled button type, runtime render-contract propagation, and a bespoke analog SVG render path.
- **Plan 08-02:** Added the committed Phase 8 analog-clock fixture, UAT script, and review-path regression coverage so the shipped clock can be judged on the real CLI/device path.
- **Plan 09-01:** Shipped the bundled `calendar-sheet` button type, tear-sheet render path, and committed Phase 9 review fixture/UAT script.
- **Plan 09-02:** Added the focused non-DOM authoring guide, verified JSX/helper example, and review-visible authoring clarity checks.
- **Plan 10-01 / 10-02 execution:** Added explicit public root and `./jsx` package build entries, moved JSX type augmentation onto the built opt-in entrypoint, switched docs/example imports to `sireno-deck-cli`, and replaced source-path verification with a build-first package-surface typecheck.
- **Phase 10 verification:** Confirmed `packages/cli/package.json#exports` now matches emitted `dist/` artifacts, the shipped authoring example resolves through the built package surface, and focused reconciler coverage keeps the helper/JSX parity example visible in tests.
- **Plan 11-01:** Shipped the canonical host/session context through runtime-owned host normalization, addon instance input, config templating, action/status execution, and a committed host-context review fixture.
- **Plan 11-02:** Added the lock-aware session-monitor seam, validated `session.locked_deck`, implemented temporary locked-mode switching with exact unlock restore plus implicit fallback, and committed the Phase 11 lock-session fixture/UAT path.
- **Phase 11 verification:** Confirmed the canonical host/session contract is wired end-to-end and that locked-mode runtime behavior is covered by focused tests and committed review artifacts, with live host detector hardening still noted as follow-up work.
- **Phase 11 security follow-up discussion:** Captured that command safety must escape host values only at the shell boundary, Linux may only claim `supported` with a real detector, and the implicit locked fallback should move onto the bundled date-time addon path.
- **Phase 12 discussion:** Captured the color-only background contract, exact button->deck->theme precedence, narrow `shrink`/`wrap` fit modes, and the decision to keep the readability floor renderer-owned while scoping the first rollout to shared/default text paths.
- **Plan 12-01:** Shipped color-only deck/button background config, explicit `button -> deck -> theme` resolution, shared/default card tinting, and a committed background review path.
- **Plan 12-02:** Replaced the old `overflow` seam with explicit `fit` modes, shipped default shrink plus opt-in wrap on the primary shared/default label path, and added a committed text-fit review path.
- **Phase 12 verification:** Confirmed `SCS-03` and `SCS-04` are covered by focused config/runtime/render tests plus committed manual review fixtures, while wider wrapper/style primitives remain Phase 13 scope.
- **Phase 13 discussion:** Captured separate wrapper/style primitive registries, direct `wrapper_id` / `style_id` references, early unknown-ref failure boundaries, shared/default-first rollout scope, and the minimum cross-addon reuse proof expected from planning.
- **Plan 13-01:** Shipped registry-backed wrapper/style primitive definitions, direct config-authored `wrapper_id` / `style_id` references, early loader validation, and a bundled core-buttons primitive registration.
- **Plan 13-02:** Carried primitive ids through the public render contract, added pre-render runtime validation for addon-authored refs, applied primitive-backed defaults on the shared/default renderer path, and committed a Phase 13 review fixture/UAT path.
- **Phase 13 verification:** Confirmed `SCS-05` is covered by focused registry/config/reconciler/runtime/render tests plus bundled-addon coverage and a committed manual review path.
- **Phase 14 discussion:** Captured the single-type toggle contract, command-authority rules, honest pending/error lifecycle behavior, and the constrained shared-base visual divergence expected for planning.
- **Plan 14-01:** Shipped the bundled internal-mode toggle contract end-to-end, including runtime-owned in-process state continuity across deck re-activation and reconnect-style activation, plus the committed Phase 14 internal-toggle review fixture/UAT path.
- **Plan 14-02:** Added the strict `get-set` toggle branch, authoritative command reads/writes with pending and error treatment, real CLI render-path mode accents, and a committed command-driven review fixture/UAT path.
- **Plan 14-03:** Added the strict `toggle-status` toggle branch, write-then-status reconciliation without local inversion, restrained third-mode render accents, and the final committed Phase 14 fixture/UAT path covering all three modes.
- **Plan 14-04:** Fixed the runtime startup render-order race so stale deck-wide `PENDING` writes cannot overwrite the first settled authoritative `get-set` state on the real device path.
- **Plan 19-01:** Exported the resolved Sireno theme as namespaced CSS vars on the browser deck shell, shipped the first narrow theme-token utility layer, and proved the contract through a themed action button plus a committed Phase 19 browser review fixture.
- **Plan 19-02:** Migrated shared browser chrome and helper-authored typography onto the theme-token utility bridge, added a committed typography review fixture, and closed focused verification for the shipped browser path.
- **Phase 18 verification:** The remaining real-device sampled-media UAT passed; `Waves` rendered as honest bounded browser sampling and the last paused Phase 18 verification item is now closed.
- **Phase 19 verification:** Both committed physical-device review fixtures passed on the attached Stream Deck, closing the token-utility and typography/shared-frame UAT gap.

### Blockers/Concerns

- **Phase 5 (Addon System):** Addon API contract must be versioned from day one; design decisions here are hard to reverse.
- **Phase 5 (Addon System):** The addon-first architecture pivot is intentionally not backward-compatible with the current button config surface, so planning must account for schema, docs, examples, and migration fallout together.
- **Phase 11:** `session-monitor.ts` is currently a narrow seam with honest supported/unsupported classification and simulated event handling, but it still needs a real supported-host event source to close the live lock-detection promise completely.

## Milestone History

### v1.4 — Addons & UX Polish
Completed: 2026-06-07
Phases: 7 (41-46, 49)
Requirements delivered: BD-03, BD-05, SRB-01, SRB-02, SRB-03, SRB-03a, SRB-03b, SRB-04, SRB-05, CAL-01, CAL-02, CAL-03, MV-01 through MV-07, WX-01 through WX-06, EMO-01 through EMO-14
Key achievements: v1.4 shipped 7 phases expanding the bundled addon surface and adding the system-reserved back button. Features include first-run Chromium auto-install, system-reserved back button in subdecks, calendar date-time button, media-volume (mute + up/down), weather addon (Open-Meteo + wttr.in fallback), and emoji-selector with real emoji rendering, paginated categories, emoji-launcher button, and noHistory page-to-page navigation. All 35 requirements satisfied, milestone audit passed.

### v1.2 — Session Context and Surface Composition
Completed: 2026-05-28
Phases: 19 tracked phase directories executed or truthfully closed
Requirements delivered: SCS-01, SCS-02, SCS-03, SCS-04, SCS-05, SCS-06, SCS-07, SCS-08, SCS-09
Key achievements: v1.2 delivered the session-aware runtime/render contract, layered backgrounds, text fitting, reusable wrapper/style primitives, richer built-in toggles, and lock-deck substitution with unlock restore. The shipped follow-on hardening phases then carried the browser theme/font pipeline, emulator, mounted addon rendering, TSX-first built-ins, and final legacy-seam cleanup across the product surface.

## Session Continuity

Last session: 2026-05-30
Stopped at: Phase 5 gap-closure pass verified and synced; next run `/review` before shipping.
Resume file: .planning/phases/05-hot-refresh-and-button-error-helper/05-VERIFICATION.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | update example config so taps are demoable in UAT | 2026-05-12 | `ea5b2d6` | `.planning/quick/001-example-config-demoable-taps` |
| 002 | finish remaining Phase 4 review regressions | 2026-05-13 | uncommitted | `.planning/quick/002-phase-4-review-regressions` |
| 003 | fix fan label contract and make display_mode text truly text-only | 2026-05-13 | uncommitted | `.planning/quick/003-fan-label-contract-text-only-display-mode` |
| 004 | fix Phase 4 activation blocking and stale-key priming regressions | 2026-05-13 | uncommitted | `.planning/quick/004-activation-blocking-stale-key-priming` |
| 005 | fix independent priming, priming error handling, and stale media metadata | 2026-05-13 | uncommitted | `.planning/quick/005-fix-independent-priming-priming-err` |
| 006 | start polling immediately per button and treat 0 RPM as valid fan data | 2026-05-13 | uncommitted | `.planning/quick/006-start-polling-immediately-zero-rpm-valid` |
| 007 | preserve internal toggle state across deck activation and reconnect | 2026-05-13 | uncommitted | `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect` |
| 008 | guard async deck activation after render and prevent stop from being undone | 2026-05-13 | uncommitted | `.planning/quick/008-guard-async-deck-activation-after-render-and-preserve-stop` |
| 009 | align fan heuristic review with v1 contract and finalize Phase 4 review | 2026-05-13 | uncommitted | `.planning/quick/009-align-fan-review-contract-finalize-phase-4-review` |
| 010 | add Phase 5 verification fixtures under packages/cli/fixtures | 2026-05-13 | uncommitted | `.planning/quick/010-add-phase-5-verification-fixtures-under-packages-cli-fixtures` |
| 011 | commit learnings | 2026-05-13 | `0f6981a` | `.planning/quick/011-commit-learnings` |
| 012 | honor token-based formatting in the bundled date-time addon | 2026-05-14 | uncommitted | `.planning/quick/012-date-time-token-formatting` |
| 013 | add the config needed for review (UAT) in the fixtures folder | 2026-05-15 | `8f321c9` | `.planning/quick/013-add-uat-review-config-fixtures` |
| 014 | fix theme/font-face test failures blocking /ship | 2026-05-25 | `866d442` | `.planning/quick/014-theme-font-face-test-failures` |
| 015 | fix this: pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml crashes with React is not defined from ButtonFrame.tsx | 2026-05-26 | `63fd4d8` | `.planning/quick/015-fix-theme-tsx-react-runtime` |
| 016 | fix ship blockers from full branch test run | 2026-05-26 | `1762ae6`, `78817e7` | `.planning/quick/016-fix-ship-blockers-from-full-branch-test` |
| 017 | fix the Phase 29 review findings: stop toggle render from mutating persisted store state, remove dead date-time class tokens, and add focused regression coverage | 2026-05-28 | `701229a`, `b97fea5` | `.planning/quick/017-fix-phase-29-review-findings` |
| 018 | Fix theme resolver regressions blocking ship | 2026-05-28 | `d6a6a73` | `.planning/quick/018-fix-theme-resolver-regressions-blockin` |
| 019 | Reconcile v1.2 milestone planning-state drift so complete-milestone can run truthfully | 2026-05-28 | `5ab3e0f` | `.planning/quick/019-reconcile-v12-milestone-drift` |
| 020 | Fix the Phase 2 shrink-fit review findings around font-load reruns and duplicate observer roots | 2026-05-29 | `c00a32f` | `.planning/quick/020-fix-phase-2-shrink-fit-review-findings` |
| 021 | Align Phase 3 planning docs to the shared `Text` markup scope | 2026-05-29 | `6576f55` | `.planning/quick/021-align-phase-3-markup-scope` |
| 022 | add the @ alias to import from src/ | 2026-06-01 | uncommitted | `.planning/quick/022-add-at-alias-to-import-from-src` |
| 023 | make @ alias resolve when running pnpm cli:dev | 2026-06-01 | uncommitted | `.planning/quick/023-make-at-alias-work-on-cli-dev` |
| 026 | Icon component should use lucide icons not svg | 2026-06-02 | `bfc0cc2` | `.planning/quick/026-icon-component-should-use-lucide-icons` |
| 027 | I want to use full instead of 'full_surface' | 2026-06-02 | `d120a29` | `.planning/quick/027-use-full-instead-of-full-surface` |
| 029 | in /works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx the icon component will get a icon name, and it should resolve that name automatically to the lucide icon, dont use a hardcoed map | 2026-06-02 | `4d4f086` | `.planning/quick/029-icon-component-auto-resolve-lucide-name` |
| 030 | Diagnose why blinking marquee text updates in emulator/browser but not on Stream Deck hardware | 2026-06-02 | `3ec2aac` | `.planning/quick/030-diagnose-why-blinking-marquee-text-updat` |
| 031 | date-time clock button minutes needle position is not correct. it's 23:47 and the neddle is arroud pass quartr position | 2026-06-02 | `21b1fe8` | `.planning/quick/031-date-time-clock-minute-needle-position` |
| 032 | Rename font-size to fontSize in TypeScript code | 2026-06-03 | `004d344` | `.planning/quick/032-fontsize-camelcase` |
| 033 | Change weather button poll interval units to minutes | 2026-06-05 | `c9e1205` | `.planning/quick/033-change-weather-poll-interval-minutes` |
| 034 | Weather snapshot stores metric internally with conversion functions | 2026-06-05 | `a1ee8e8`, `d3debeb`, `e4c83a7` | `.planning/quick/034-weather-normalize-metric-units` |
| 035 | Render real hourly forecast in weather button forecast page | 2026-06-05 | `1738536`, `1539b71`, `15dea99` | `.planning/quick/035-weather-hourly-forecast` |
| 040 | Reduce weather widget forecast page from 6 columns to 2 | 2026-06-07 | `d68174c` | `.planning/quick/040-weather-forecast-reduce-to-2` |
| 005 | icon prop in the actions buttons should allow to use icon://[lucide-icon-name] | 2026-06-09 | `3b889df` | `.planning/quick/005-icon-protocol-lucide` |
