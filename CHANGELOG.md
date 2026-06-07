# CHANGELOG

## 2026-06-07

### Features

- Added a shared internal `core/pagination.ts` utility that owns the paged-category pattern. Exposes `buildPageNavButton`, `definePagedCategoryButton`, and `paginateDecks` so future paginated addons (icon-picker, snippet-picker) reuse the same seam instead of inlining a per-addon copy. The emoji-selector now imports the helpers from `@/core/pagination` and no longer carries its own `buildPageNavButton`.
- Made page-to-page navigation on paginated emoji subdecks invisible to the back stack. The change-deck button detects `meta: 'page-nav'` and routes both tap and double-tap through `methods.navigateToDeck(target, { addToHistory: false })`, so the n-2 page-nav replaces the active deck instead of pushing. Pressing back from any paginated page now returns to the parent deck, not the previous page.
- Migrated the page-nav render in `change-deck.tsx` to the actual `Chip` component (`@/ui/Chip`) with the existing `tone="muted"` palette. The raw `text-[10px] opacity-70` divs for the "Tap" / "Dbl Tap" overlays are gone; the chrome is consistent with the rest of the deck's badge surface.

### Fixes

- The `pasteText` path is now backed by `clipboardy`, surfacing clear errors when the host's clipboard tool (xclip / pbcopy / Set-Clipboard) is missing. Root cause was the per-OS `execa`-spawned clipboard writer silently failing on hosts without a clipboard tool — the subprocess exit code was swallowed and the user saw a "type" with no output. `clipboardy` throws on failure, so the runtime now surfaces a structured button-runtime diagnostic instead of a silent miss.

## 2026-06-06

### Features

- Added the emoji-selector's first-class `emoji-launcher` button type. The launcher renders a 2×3 grid of six representative emojis (😂 🔥 ❤️ ⭐ 🍕 🎵) at a larger size and lives at position 0 of the main deck as the addon's visual entry point. The bundled `launcher.svg` asset ships alongside the button type for the icon-backed fallback path.
- Added a per-OS HID keyboard-stroke shim to the emoji-selector so single-tap types the emoji (via `xdotool` on Linux, `pbcopy`+`osascript` on macOS, or `Set-Clipboard`+`SendKeys` on Windows) and double-tap types the conventional shortcode (e.g. `:fire:`). The new `select_command_shortcode` config field lets users override the shortcode path; `select_command` keeps its existing role for the tap path.
- Added a hand-curated `data/categories.json` emoji catalog with 11 pre-split subcategories (smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags) and 383 emojis. The catalog is the new source of truth; the addon's per-category default emoji lists are gone.
- Added real emoji rendering via the native platform font stack (`'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif`). The `Text` component grew a `5xl` size step and a `fontStack` prop. The bundled 12 branded SVG icons stay as deliberate overrides.
- Added the n-2 page nav layout: each emoji-selector subdeck page has 12 emojis (positions 0-11), a single page-nav button at position 13 with `meta: 'page-nav'` (Tap = next page, Double-tap = previous page) and corner chip overlays (`Tap` top-left, `Dbl Tap` bottom-right). The change-deck button type grew a `target_deck_double_tap` field and a 300ms timestamp-based double-tap detector.
- Added the addon-decorated system back: deck configs can now set `system_back_tap_command` and `system_back_hold_command` to route the system-back gesture through a custom command via the action executor. When unset, the default goBack/restoreStack behavior is preserved.

### Breaking Changes

- Renamed the per-emoji entry button type from `emoji-entry-button` to `emoji-emoji-button`. The new `emoji-launcher` button type replaces the conceptual "main entry button" role. **Action required:** existing config files that reference `type: emoji-entry-button` in `buttons` lists must be updated to `type: emoji-emoji-button`. The rename is documented here for any out-of-tree configs (the bundled example config has been updated).

### Fixes

- Fixed the emoji-selector pagination layout so subsequent pages no longer displace an emoji slot for a prev button. The new `n-2` page nav is at position 13 (outside the emoji grid), and `EMOJI_PAGE_SIZE` is now 12 with a uniform 12-emoji-per-page model.

### Learnings

- The Phase 34 `commands.tap` action contract is a literal command string, not a method call. Where a button needs to call `methods.navigateToDeck` on a different target per gesture, a custom onTap with timestamp-based double-tap detection is simpler than trying to extend the command-string contract to encode navigation. Pragmatic deviation > over-abstraction.
- The runtime's `runtimeDecks` lookup at instance creation time is the right place to read deck-level decoration. Mutating the deck config after `runtime.start()` has no effect, which matches the "config is immutable for the lifetime of the runtime" model.
- The "U+1Fxxx" text fallback was a bug, not a feature. Once a native emoji font stack is in the platform's font catalog, the placeholder text becomes visual noise. The real fix is a font-stack render, not better placeholder formatting.

## 2026-06-05

### Features

- Added real hourly forecast (next 6 entries) to the weather button's `forecast` page: each column shows hour, WMO icon, converted temperature, and precipitation chance. Primary provider (open-meteo) walks 2h stride; the wttr.in fallback walks native 3h cadence.

### Fixes

- Fixed the weather button's forecast page only rendering 3 columns when the next future hour sat late in the open-meteo hourly window. Root cause was that `buildHourlyEntries` walked at stride 2 and broke out of bounds, so the page silently collapsed to whatever slots remained. Bumped `forecast_days` to 3 and made the walker fall back to stride 1 when fewer than 12 future slots remain, so the page renders a full 6 columns in all real cases.

### Learnings

- A "stride N" walker that breaks out of bounds silently produces a too-short list that the UI renders as a partial layout. The fix that preserves the original cadence intent is to fall back to a denser stride within available data, not to fabricate. Always validate that the worst-case start offset still yields the desired count.
- When a UI commits to "show 6 of X", the data layer should guarantee 6 wherever the source has data. A test that uses 3 entries hides this class of bug — the populated-case test now uses 6 to mirror production.

## 2026-06-02

### Features

- Added export-driven Lucide icon resolution to the shared `Icon` component so generic icon names now resolve directly from the installed `lucide-react` package instead of a handwritten local registry.

### Fixes

- Fixed shared icon-name drift by removing local generic icon allowlists from the `Icon` surface and nearby caller seams, and by switching the runtime warning icon to the real Lucide name `triangle-alert`. Root cause was that the UI layer had claimed to accept icon names while still depending on a private hardcoded subset, which forced nearby code to maintain shadow icon maps and stale aliases.
- Fixed the bundled analog clock button so it now renders a real analog dial with live hour and minute hands instead of a placeholder text card. Root cause was that the Phase 8 button file had drifted into a static label surface while the product and review fixtures still treated it as a real clock visual.
- Fixed the built-in date-time addon contract drift by registering both `clock` and `analog-clock` button ids against the same analog clock implementation and updating the focused addon test to cover the live shipped button set. Root cause was that the repo example config had moved to `clock` while older fixtures and tests still referenced `analog-clock`, leaving the addon surface internally inconsistent.
- Fixed the core button-surface contract to use `full` instead of `full_surface` across config parsing, runtime transport, hosted rendering, and shipped fixtures while keeping the emitted DOM marker `data-sireno-full-surface` stable for browser assertions. Root cause was that the outer product contract had drifted away from the authored `ButtonSurface` prop, leaving one concept with two names depending on which seam you touched.
- Fixed browser theme button/frame color drift after enabling Tailwind slash-opacity color variants by exporting Tailwind `--color-*` runtime tokens from the deck root alongside existing `--sireno-*` tokens. Root cause was that Tailwind utilities were resolving through `--color-*` while live theme values were only guaranteed on `--sireno-*`, which created an indirection seam that could mis-resolve in frame surfaces.

### Learnings

- If a shared component claims to accept library-defined names, the resolver should derive from the library surface itself. Once callers start carrying their own allowlists or aliases, the contract is already lying.
- Live visual buttons need output-focused regression coverage. A cadence assertion alone will stay green even after the visual silently collapses back into placeholder text.
- If one runtime concept already has a canonical authored name, the surrounding config and transport seams should use that same name. Leaving `full_surface` outside and `full` inside only creates needless translation drift.
- Tailwind color tokens should be materialized where theme values actually live at runtime. Build-time token mapping alone is not enough if rendered surfaces consume color classes from a different variable namespace.

## 2026-05-31

### Fixes

- Fixed `cli:dev` argument forwarding so `pnpm cli:dev -- emulate --port 8912` no longer stalls behind a literal leading `--` token passed through by pnpm script forwarding. Root cause was that the dev watch argument resolver treated any non-empty argv as final command args and forwarded pnpm's sentinel token directly to yargs.

### Learnings

- Workspace-root script forwarding can inject a leading `--` sentinel that is transport metadata, not a user command token. Wrapper entrypoints must normalize forwarded argv before delegating to strict command parsers.

## 2026-05-27

### Features

- Added a component-first addon authoring kit at the public `sireno-deck-cli` root surface, including mounted `ButtonSurface`, core-owned `Icon` / `Chip` / `Text` primitives, theme presentation hooks for those primitives, and a truthful workspace-root `cli:dev` watch loop that runs the real `start --config config.yml` seam through `tsx`.
- Added explicit emulator render intent to the shared browser deck renderer so one `renderDomDeck(...)` seam can serve both flat browser-capture HTML and emulator-only shell chrome.
- Added truthful Phase 27 execution artifacts covering manifest-only theme fallback ownership, watched built-in theme runtime graphs, emulator-only shell chrome, and the real TSX runtime proof path.

### Fixes

- Fixed Phase 28's helper-factory authoring drift by migrating shipped addons, runtime fallback UI, tests, fixtures, and docs onto the same component-first TSX contract instead of keeping `createDom*` / `createBaseShape*` as a shadow public surface. Root cause was that the repo had accumulated two contradictory authoring models, so helpers remained the real runtime/default path even after the mounted `render(props)` seam and TSX runtime work were already in place.
- Fixed the theme contract so manifest-backed theme packages are now the only supported theme model and the built-in default theme package owns the sole fallback `buttonFrame`. Root cause was that a leftover `legacy_yaml` branch and core-owned fallback frame kept two contradictory theme/fallback contracts alive.
- Fixed raw theme and addon TSX runtime loading to use the package `tsconfig.json` instead of `tsconfig: false`, and moved the honest regression proof from the flaky `tsx` CLI wrapper to `node --import tsx/esm`. Root cause was that the real runtime seam had drifted away from the package TSX policy, so touched runtime modules still depended on ambient React-import workarounds outside test-only transforms.
- Fixed emulator deck-root patching so stale non-key children such as inline warnings are removed when deck HTML changes. Root cause was that the browser-side patcher only reconciled keyed button nodes and left sibling UI chrome behind.
- Fixed the repo-root raw-source CLI seam so `pnpm exec tsx packages/cli/src/cli/index.ts ...` now inherits the same JSX policy as the package runtime and no longer crashes with `React is not defined` during emulator startup. Root cause was that the workspace root had no TSX policy anchor, so the exact developer/UAT command compiled JSX-authored runtime code differently from the package-local seams already under test.

### Learnings

- Helper removal only becomes real when shipped addons, runtime-owned fallback UI, tests, fixtures, and docs all move in the same cut. Leaving any of those seams on the old helpers creates fake compatibility and the next phase inherits drift instead of a clean contract.
- A dev watch command is only honest if it runs the exact raw-source CLI/start seam developers use and explicitly includes non-imported config/theme/addon files. Watching TypeScript imports or bundler output alone will miss the repo edits people actually make.
- Theme fallback ownership has to live in exactly one shipped runtime seam. Leaving both a core fallback frame and a built-in theme fallback alive guarantees drift.
- For TSX runtime bugs, the honest proof is the same loader/runtime path production uses. A passing Vitest transform or a hanging wrapper CLI does not prove the actual seam is healthy.
- DOM patchers that only reconcile the main repeated nodes will quietly accumulate stale sibling UI. Patch the whole direct-child list of the container you own.
- If the documented developer command runs from repo root, keep a regression on that exact repo-root seam. Package-local import proofs are useful, but they can still miss the CLI path people actually run.

## 2026-05-23

### Features

- Added a Sireno-owned browser utility bridge that exports resolved theme CSS variables and makes shipped browser-rendered buttons consume classes such as `text-primary`, `bg-background`, `border-accent`, `font-main`, and `font-aux`.
- Added theme-aware shared browser button chrome plus committed Phase 19 review fixtures for both token-color and typography/frame verification on the real browser path.

### Fixes

- Fixed browser-backed live buttons such as the bundled clock/date-time surfaces so polling-driven second changes actually redraw on-device when running from the repo-root config. Root cause was that runtime polling refreshed the individual button cache, but the React DOM/browser render path only pushes pixels from a deck-level render callback.
- Fixed the Phase 19 theming seam so helper-authored labels and shared browser chrome no longer bypass the new utility contract with hardcoded inline typography/colors. Root cause was that Wave 1 exported theme tokens successfully, but the default helper/frame path still owned presentation inline.

### Learnings

- In the browser-backed renderer, a polled button refresh is not enough by itself. If the hardware write path is deck-scoped, polling updates have to trigger a fresh deck render or the device will keep showing stale frames.
- Exporting theme tokens is not enough if the default helper path still hardcodes presentation. The real contract only exists once the shipped shared surface consumes it.
- The safe migration path is additive: default helpers can emit stable theme-role classes while plain `className` authoring stays the primary model.

## 2026-05-18

### Features

- Added explicit color-only background config for decks and buttons, with shared precedence resolved as `button -> deck -> theme` through the live runtime and render path.
- Added an explicit public text-fit contract with `fit: "shrink" | "wrap"`, and shipped the first shared/default label rollout for default shrink plus opt-in wrap.
- Added repo-pinned Phase 12 review fixtures under `packages/cli/fixtures/phase-12/` plus updated UAT instructions so background precedence and shrink-vs-wrap behavior are reviewable from committed inputs.

### Fixes

- Fixed the render pipeline so configured backgrounds no longer disappear inside strict addon validation or get re-decided ad hoc inside the renderer. Root cause was that deck/button background data did not have a core-owned seam outside addon payload schemas, and the shared/default card still derived its base tint only from `theme.background`.
- Fixed the shared text contract to stop hiding future fit behavior behind `overflow: "clip"`. Root cause was that wrapper chrome and text fitting were still coupled accidentally through the Phase 7 overflow prop, which made the first explicit fit rollout harder than it needed to be.

### Learnings

- Core-owned config fields have to stay outside strict addon schemas or the platform turns legitimate product-level features into addon validation failures.
- The real background precedence seam was runtime-plus-render transport, not the SVG renderer alone. `renderTextImage()` only sees one button at a time, so deck fallback has to be materialized before pixel generation.
- Wrapper chrome and text fitting are separate contracts. If they share one legacy prop, later feature work inherits accidental coupling instead of a clean public API.

## 2026-05-16

### Features

- Added an explicit public root authoring facade for `sireno-deck-cli` so helper-based addon rendering now resolves from the packaged CLI instead of repo-local internals.
- Added intentional build entries for the package root and `sireno-deck-cli/jsx`, so `dist/index.*` and `dist/render/jsx.*` are emitted exactly where the public exports promise them.

### Fixes

- Fixed the addon authoring release blocker where `packages/cli/package.json` advertised public root and JSX entrypoints that the build did not actually emit. Root cause was that `tsdown` only built the CLI binary entry while docs and fixture verification were still leaning on source-path access and local TypeScript path mapping.
- Fixed the reconciler parity coverage to load the shipped JSX authoring example module itself instead of reconstructing that example piecemeal inside the test, and folded the built-package authoring typecheck into package verification so export drift gets caught in the normal verify path.
- Fixed the package `verify` path to run the test suite again alongside build and built-package authoring checks, then aligned stale `builtin-*` button-type expectations with the actual bundled `display-text` / `change-deck` contract so restored coverage fails on real drift instead of historical leftovers.

### Learnings

- Package exports are a delivery contract, not documentation. If the build graph does not emit the exact exported files, in-repo examples can look healthy while the published package is still broken.
- JSX opt-in seams that split runtime and types across separate source files are fragile unless the emitted package surface is verified directly from the built output.
- A parity test only protects the shipped example if it imports that example through the same package surface authors use; rebuilding the example inline hides self-reference and verification wiring regressions.
- Restoring verification coverage is only useful if the assertions still describe the live product surface. Otherwise `verify` goes red for archaeological reasons and people stop trusting it.

## 2026-05-15

### Features

- Added Phase 7 typography tokens to the theme contract and routed shared Stream Deck text rendering through theme-defined `main_text`, `auxiliary_text`, and `monospace` roles.
- Added an opt-in shared wrapper/text render contract with explicit `overflow: "clip"` and `wrapper: "shared"` fields that now flow from reconciler output through the runtime render path.
- Added repo-pinned Phase 7 review fixtures under `packages/cli/fixtures/phase-7/` so manual UAT can compare dark/light shared text and exercise the optional wrapper contract from committed inputs.

### Fixes

- Fixed the shared SVG renderer to stop hardcoding inline font metrics and relying on incidental raster cropping for overflow. Root cause was that text styling and truncation behavior were still buried inside repeated SVG snippets instead of being expressed as a renderer contract.

### Learnings

- Text rendering contracts need two seams, not one: theme tokens decide typography, and explicit render props decide overflow/wrapper behavior. When either seam is implicit, later widget work inherits accidental behavior instead of a reusable contract.
- Manual review drifts for the same reason tests do. If the exact UAT configs and addon-backed inputs are not committed in the repo, people end up checking different surfaces and blaming the wrong layer.

## 2026-05-14

### Fixes

- Fixed the bundled date-time addon to honor `date_format` and `time_format` token strings such as `DD/MM/YYYY` and `HH:mm:ss` instead of ignoring them and always rendering locale-short output through `Intl.DateTimeFormat`. Root cause was that the schema exposed token-based config fields, but the render path still hard-coded Intl style options.

### Learnings

- Config fields are part of the runtime contract. If a built-in addon advertises format strings, the render path has to consume those exact strings or the addon ships dead configuration.

## 2026-05-13

### Features

- Added Phase 4 fan and media button support, including config examples, active-deck polling, fan fallback rendering, and command-driven media metadata layouts.
- Added deterministic emoji-entry card visuals for the bundled emoji selector so selection tiles stay identifiable without host emoji font support.
- Added repo-pinned Phase 5 verification fixtures under `packages/cli/fixtures/phase-5/` for healthy local addon startup, warning isolation, apiVersion mismatch, and npm-addon manual verification.

### Fixes

- Fixed the shipped Phase 5 example config to stop advertising nonexistent local and npm addons as runnable examples, and removed the stale `addon://core-buttons/home.svg` asset reference. Root cause was that the sample config had drifted away from the actual repo contents after the addon-system rollout.
- Fixed addon SVG icons to render through inline SVG composition instead of nested data-URI `<image>` embedding, which was producing blank icon regions on-device through the sharp/libvips pipeline.
- Fixed async deck activation so a late `onRenderDeck` completion cannot restart polling after `stop()` or replace a newer activation's schedulers after restart. Root cause was that activation only checked ownership before awaiting the deck render, then always resumed polling startup afterward even if that activation had been stopped or superseded.
- Fixed internal toggle buttons to preserve their in-memory state across deck reactivation and reconnects instead of resetting back to the first configured state on every activation. Root cause was that activation cleanup treated internal toggles like externally-polled buttons even though they have no authoritative status command to rehydrate from.
- Fixed the Phase 4 runtime gap where fan and media button schemas existed without any runtime/render path behind them. Root cause was that 04-03 had been planned but not implemented yet.
- Fixed live fan reads to degrade into an explicit unavailable state instead of leaking missing sensor data through the render path.
- Fixed Phase 4 fan polling to fall back to an unavailable state when `systeminformation.graphics()` throws, instead of letting the polling loop fail on unsupported hosts.
- Fixed Phase 4 activation so per-button schedulers start immediately after the deck render instead of waiting for priming to settle; root cause was still treating priming completion as the gate for steady-state polling startup.
- Fixed fan telemetry normalization to treat `0 RPM` as valid readable data instead of collapsing idle-but-readable sensors into the unavailable fallback.
- Fixed the shared button display-model helper to recognize CPU, memory, fan, and media defaults so advanced-button previews do not drift from the runtime render path.
- Fixed the fan preview contract so the configured unavailable fallback is only rendered when fan sensors are actually unavailable; root cause was that the duplicate preview-model helper had treated the runtime fallback as static default text.
- Fixed `display_mode: text` for CPU and memory buttons to stop emitting progress-bar metadata and the fake `TEXT` badge, so text mode now renders as actual text-only output.
- Fixed Phase 4 deck activation to render immediately again instead of blocking on slow polled buttons, while still clearing poll-driven state first so stale key content does not flash from the previous deck. Root cause was the earlier stale-state fix moving activation behind synchronous priming, which traded stale keys for visibly blocked deck switches.
- Fixed Phase 4 activation priming so polled buttons prime independently and a rejected priming refresh cannot prevent sibling buttons or polling startup from recovering. Root cause was serial priming treating one rejected refresh as fatal for the whole activation pass.
- Fixed media buttons to clear stale metadata when a later metadata refresh fails, instead of continuing to render the last successful track details as if they were current.

### Learnings

- Example configs are part of the product surface. If they point at fake addons or dead assets, UAT fails even when the underlying loader behaves exactly as designed.
- Manual verification drifts for the same reason tests do: if the inputs are not committed in the repo, people will verify different things and blame the wrong layer.
- SVG support in a renderer is not binary. A path that accepts SVG files can still fail visually if the composition strategy depends on image embedding behavior that the downstream rasterizer handles poorly.
- Async activation boundaries need guards on both sides of awaited work. Checking ownership only before `await` is not enough when late continuations can still restart schedulers or clobber newer runtime ownership.
- Internal state should only be cleared when there is another source of truth to refill it. Resetting purely local toggle state during activation guarantees drift back to defaults on deck switches and device reconnects.
- `systeminformation` is great for CPU and memory, but generic fan data is not a clean cross-platform primitive, so the adapter has to normalize a narrower supported source and make unavailability explicit.
- Valid zero telemetry and missing telemetry are not the same thing. Metric adapters need to encode that distinction explicitly or idle hardware gets mislabeled as unavailable.
- Command-driven media buttons stay sane if tap actions and authoritative state refresh remain separate; optimistic UI flips would have lied the moment the external player disagreed.
- When Phase 4 adds a new button variant, every duplicate display-model path has to be updated in the same change or previews quietly regress while the runtime still looks correct.
- Visual modes should be expressed by the render payload itself. If `text` mode still ships progress numbers or badge copy, it is not really a separate mode.
- Activation-time polling cannot be the thing that decides whether the deck surface appears. The safer split is: render defaults immediately, drop cached poll-driven state for the new deck, and ignore late priming from older activations with an activation token.
- Priming is startup hygiene, not a transaction boundary. If one polled button cannot refresh, the rest of the deck still needs to converge and stale media data has to be cleared explicitly when authority disappears.
- Scheduler startup and priming should not share the same gate. If priming is slow, steady-state polling still needs to begin immediately so the deck converges per button instead of waiting on the slowest refresh.

## 2026-05-12

### Features

- Added the initial pnpm workspace, `sireno-deck` CLI package, strict config schema, YAML config loader, shared logger, and lifecycle commands for `start`, `status`, and `stop`.
- Added PID-file daemon lifecycle management with graceful `SIGTERM` / `SIGINT` shutdown handling.

### Fixes

- Fixed config validation so invalid `config.yml` errors retain file path, line number, and actionable suggestions instead of losing context after schema validation.
- Fixed the CLI build output to produce `dist/cli.js`, matching the package binary entry.
- Fixed the manifest to use a real `@types/yargs` version after install failed on the original non-existent range.
- Fixed the daemon start path to use `yargs.parseAsync()` and an actual event-loop keepalive; root cause was that async handlers were returning early and an unresolved promise alone does not keep Node alive.

### Learnings

- Pretty error formatting is useless if metadata gets dropped before rendering; error context has to survive the full parse/validate/load pipeline.
- Verification caught more truth than the plan text alone: install, build, and live lifecycle runs exposed manifest and process-lifetime bugs that static code review would have missed.
- For Node CLIs, async command handlers require async parsing, and foreground daemons need a real event-loop anchor.
