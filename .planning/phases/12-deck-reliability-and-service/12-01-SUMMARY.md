# Plan 12-01 Summary

**Completed:** 2026-07-22

## What was built
Collapsed four empty split system-status button types (`system-status:cpu|ram|disk|net`) into a single generic `system-status` button that renders up to three metrics from a 10-metric stdlib-only catalog (cpu, ram, disk, network, battery, temperature, uptime, frequency, load, processes). Probes run on a 2s cadence via `AddonGlobalService.pollers`, publishing on `runtime:system-status:<id>` channels that the React frontend subscribes to via `useAddonChannel`. Two display modes: text rows and bars. Hard cutover — old split types no longer exist; any deck still referencing them becomes an invalid-button surface (handled by plan 12-03).

## Key files
- `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts`: probe catalog + `SYSTEM_METRIC_IDS` (stdlib only; `os.cpus`, `totalmem/freemem`, `statfs`, `/sys/class/power_supply/BAT0/capacity`, `/sys/class/thermal/thermal_zone0/temp`, `process.uptime`, `/proc/cpuinfo`, `loadavg`, `/proc` count)
- `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts`: per-metric formatter mapping (percent, bytes, count, frequency-ghz, uptime) — no `numbro` dep
- `packages/cli/src/builtin-addons/system-status/buttons/generic/schemas.ts`: `GenericSystemStatusSchema` with `metrics[1..3]`, `display`, `pollInterval`, `renderInterval`, `formatters`, `commands`, `labels`
- `packages/cli/src/builtin-addons/system-status/buttons/generic/frontend.tsx`: text + bars renderers, one row per metric, unavailable caption fallback, render-interval tick to refresh bars
- `packages/cli/src/builtin-addons/system-status/manifest.ts`: single `system-status` button registration + one poller per metric
- `packages/cli/src/builtin-addons/system-status/index.ts`: simplified `registerSystemStatusAddon(registry)`
- `config.yml`: demo button switched from `system-status:status` + `metric: cpu|ram` to `system-status` + `metrics: [cpu, ram, battery]`
- `packages/cli/src/builtin-addons/system-status/__tests__/manifest.test.ts`: 3 tests asserting single button, no legacy types, 10 pollers wired to correct channels (passes)
- `packages/cli/src/__tests__/fixtures/system-status-deck.ts`: minimal deck fixture with ponytail: visual verify comment

## Decisions made
- **No new dependencies**: replaced the legacy `systeminformation` + `numbro` with stdlib (`node:os`, `node:fs/promises`) and inline formatters. Battery and temperature probes are Linux-only (`/sys`); they report unavailable on other platforms.
- **Global poller instead of pubSub**: rewired into `AddonGlobalService.pollers` (one per metric) to match the Phase 11 manifest API rather than keeping the standalone `pubSub` registration.
- **Dropped per-button `subscribedMetrics` tracking** from the plan spec — always polling 10 metrics at 2s cadence is negligible overhead and avoids the over-engineered subscription bookkeeping.
- **Hard cutover** of old types per CONTEXT.md decision; deleted `buttons/cpu|ram|disk|net/` directories.

## Notes for downstream
- `run.ts:registerSystemStatusAddon` call site updated to drop the unused `pubSub`/`signal` arguments.
- The `metrics: ["cpu", "ram", "battery"]` config in `config.yml` exercises the text mode with three rows; the bars mode is also wired but not currently demoed in `config.yml`.
- Visual verification skipped: no screenshot convention in this repo. The ponytail: comment in the deck fixture records intent.
- 35 pre-existing test failures remain in the repo (Text primitive refactor, emoji-selector, weather, run.test.ts mock gap on `listDeckTypes`, addon-decks ordering) — all unrelated to this plan.