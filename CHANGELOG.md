# CHANGELOG

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
