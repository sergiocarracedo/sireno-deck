# CHANGELOG

## 2026-05-13

### Features
- Added Phase 4 fan and media button support, including config examples, active-deck polling, fan fallback rendering, and command-driven media metadata layouts.

### Fixes
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
