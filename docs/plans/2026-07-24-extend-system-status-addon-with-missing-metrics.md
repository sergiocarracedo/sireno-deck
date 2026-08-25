# Extend system-status with missing metrics

- **Date:** 2026-07-24
- **Branch suggestion:** `feat/system-status-missing-metrics`
- **Product contract source:** ce-plan-bootstrap
- **Plan depth:** Standard
- **Status:** Complete (2026-07-29)

## 1. Goal

Add 8 missing metrics to the `system-status` addon so users can surface every relevant OS signal in the existing bars + kpis button types. All new metrics follow the established pattern: Linux-first probe, gracefully degrade to `available:false` on non-Linux / missing hardware, render `—` in the UI. Existing metrics that already cover the user's request (cpu, ram, swap, load, cpu temp via `temperature`, cpu freq via `frequency`, uptime, disk, battery, processes) are unchanged.

## 2. Settled decisions

| Decision            | Choice                                                                      | Why                                                         |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Network placeholder | Keep `network` (interface count) stub; add `network-read` + `network-write` | Backward-compat; opt-in throughput                          |
| GPU vendor scope    | sysfs (amdgpu) + `nvidia-smi` fallback via `execa`                          | amdgpu zero-cost; NVIDIA works if `nvidia-smi` is installed |
| Per-device collapse | First match by preference order                                             | Fits the 1–3 line kpis surface; per-device IDs deferred     |
| New formatters      | Add `bool` ("ON"/"OFF") + `rate-bytes` ("5.2 MB/s")                         | Cleanest UX; ~30 LOC in `display-metrics.ts`                |
| Platform policy     | Linux-first; `available:false` elsewhere                                    | Matches `swap`, `battery`, `temperature`, `processes`       |
| Unavailable display | `—` via existing `toDisplayMetric` branch                                   | No change                                                   |

## 3. Metric specifications

`cpu`, `ram`, `swap`, `load`, `temperature` (cpu temp), `frequency` (cpu freq), `uptime`, `disk`, `battery`, `processes` are **unchanged**.

New metrics:

| ID              | Source                                                                                                                                                                           | Unit     | Views                      | Formatter  | Default label | Icon                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------- | ---------- | ------------- | ------------------------ |
| `cpu-boost`     | `/sys/devices/system/cpu/cpufreq/boost` (Intel); `/sys/devices/system/cpu/intel_pstate/no_turbo` (negated) — preference order                                                    | on/off   | kpis                       | bool       | Boost         | `icon://zap`             |
| `disk-io`       | Sum `sectors_read` + `sectors_written` from `/proc/diskstats` across non-virtual block devices (skip loop/ram/dm-/md-); delta over poll interval                                 | B/s      | kpis                       | rate-bytes | Disk I/O      | `icon://arrow-down-up`   |
| `gpu-temp`      | sysfs `/sys/class/drm/card*/device/hwmon/hwmon*/temp1_input` (m°C → °C); fallback `nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits` (execa, 100 ms timeout) | °C       | bars, kpis                 | count      | GPU Temp      | `icon://thermometer-sun` |
| `gpu-usage`     | sysfs `/sys/class/drm/card*/device/gpu_busy_percent`; fallback `nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits`                                            | %        | bars, kpis                 | percent    | GPU           | `icon://microchip`       |
| `fan-rpm`       | First `fan1_input` across `/sys/class/hwmon/hwmon*/fan1_input`                                                                                                                   | RPM      | kpis                       | count      | Fan           | `icon://fan`             |
| `network-read`  | Sum `rx_bytes` across non-loopback / non-virtual `/sys/class/net/*/statistics/rx_bytes`; delta over poll interval                                                                | B/s      | kpis                       | rate-bytes | Net RX        | `icon://arrow-down`      |
| `network-write` | Same path, `tx_bytes`                                                                                                                                                            | B/s      | kpis                       | rate-bytes | Net TX        | `icon://arrow-up`        |
| `cpu-voltages`  | First `in0_input` (mV) from a hwmon whose `name` matches `/k10temp                                                                                                               | zenpower | coretemp/`; convert mV → V | V          | kpis          | count                    | Vcore | `icon://bolt` |

All new probes return `available:false` on non-Linux platforms and on missing/empty files (existing `try { ... } catch { available:false }` wrapper). Delta-based probes (`disk-io`, `network-read`, `network-write`) follow the existing `probeCpu` pattern: module-level `prevSample` snapshot, return `value:0` on first sample or counter reset (guard `total <= prev.total`).

## 4. Files to change

### Domain

- `packages/cli/src/builtin-addons/system-status/domain/metric-ids.ts` — extend `SYSTEM_METRIC_IDS` (now 19 ids).
- `packages/cli/src/builtin-addons/system-status/domain/catalog.ts` — add 8 `MetricDef` entries. Drift guard at module load is unchanged.
- `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts` — extend `SystemStatusFormatter` union to `"bytes" | "bool" | "count" | "frequency-ghz" | "percent" | "rate-bytes" | "uptime"`. Add `formatBool` ("ON"/"OFF") and `formatRateBytes` ("5.2 MB/s" with binary scaling). Register both in `resolveFormatter`.
- `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts` — add 8 probe functions + register in `PROBES` map. Add module-level `prevSample` state for the three delta probes.

### Frontends

- `packages/cli/src/builtin-addons/system-status/buttons/system-status/frontend.tsx` — extend `useAllMetricChannels` with 8 new `useAddonChannel<MetricPayload>("runtime:system-status:<id>")` calls. Render loop is metric-id driven via `SYSTEM_METRIC_IDS`, so no other logic changes.
- `packages/cli/src/builtin-addons/system-status/buttons/kpis/frontend.tsx` — same hook expansion.

### Tests (update existing)

- `packages/cli/src/builtin-addons/system-status/__tests__/manifest.test.ts` — extend expected channels list to 19 entries.
- `packages/cli/src/builtin-addons/system-status/__tests__/catalog.test.ts` — extend `kpis-only` list (`cpu-boost`, `disk-io`, `network-read`, `network-write`, `fan-rpm`, `cpu-voltages`); `gpu-temp` and `gpu-usage` are bars+kpis.

### Tests (new — each Linux-conditional; non-Linux exits early)

- `packages/cli/src/builtin-addons/system-status/__tests__/boost-metric.test.ts` — reads `/sys/devices/system/cpu/cpufreq/boost` (and pstate fallback); asserts `id='cpu-boost'` registered; on Linux returns `0` or `1`.
- `packages/cli/src/builtin-addons/system-status/__tests__/disk-io-metric.test.ts` — first sample returns `value:0`; subsequent samples return non-negative rate; counter-reset guard verified.
- `packages/cli/src/builtin-addons/system-status/__tests__/network-throughput-metric.test.ts` — first sample `0`; sums across non-loopback / non-virtual interfaces.
- `packages/cli/src/builtin-addons/system-status/__tests__/gpu-metrics.test.ts` — amdgpu sysfs path returns number; nvidia-smi path skipped when binary missing (mocks `execa` / `child_process`).
- `packages/cli/src/builtin-addons/system-status/__tests__/fan-rpm-metric.test.ts` — picks first `fan1_input`; returns `available:false` if none.
- `packages/cli/src/builtin-addons/system-status/__tests__/cpu-voltages-metric.test.ts` — hwmon name match; mV → V conversion; `in0_input * 0.001` rounded.
- `packages/cli/src/builtin-addons/system-status/__tests__/display-bool-formatter.test.ts` — `true → "ON"`, `false → "OFF"`, unavailable → `"—"`.
- `packages/cli/src/builtin-addons/system-status/__tests__/display-rate-bytes-formatter.test.ts` — `0 → "0 B/s"`, `1024 → "1.0 KB/s"`, `1_000_000 → "976.6 KB/s"` (binary), `1_000_000_000 → "953.7 MB/s"`.

### Docs & config

- `packages/cli/src/builtin-addons/system-status/README.md` — **NEW**. Mirror the `value-display/README.md` shape: button types table + metric catalog table (id, source, unit, views, default label, icon).
- `config.yml` `sys-status-demo` deck — add one button per new metric (per existing convention).
- `packages/cli/src/builtin-addons/{brightness,media,date-time,value-display,internal-settings}/README.md` already link to `system-status/README.md`; no edits required — the link resolves once the README exists.

## 5. Implementation order

1. **Domain first.** `metric-ids.ts` + `catalog.ts` (drift guard catches mistakes); `display-metrics.ts` formatters.
2. **Probes.** 8 functions in `live-metrics.ts` with delta state for the three rate probes.
3. **Tests in lockstep.** Update `manifest.test.ts` + `catalog.test.ts`; add per-probe + formatter tests. Run `pnpm test`.
4. **Frontend hooks.** 8 channels in both `frontend.tsx` files.
5. **Demo deck.** Extend `config.yml`.
6. **README.** Catalog table.
7. **Verify.** `pnpm lint && pnpm format && pnpm typecheck && pnpm test`; then emulator run.

## 6. Test scenarios

Per implementation unit (Linux-conditional where applicable):

- **catalog drift guard**: loading `domain/catalog.ts` throws if `SYSTEM_METRIC_IDS` and `METRICS_CATALOG` keys diverge.
- **`probeMetric('cpu-boost')`**: snapshot `id='cpu-boost'`, `available:boolean`; on Linux with `boost` file returns `0` or `1`.
- **`probeMetric('disk-io')`**: first sample returns `value:0`; second sample returns non-negative rate (B/s).
- **`probeMetric('network-read'|'network-write')`**: first sample `0`; sums non-loopback / non-virtual interfaces.
- **`probeMetric('gpu-temp'|'gpu-usage')`**: amdgpu sysfs path returns number; nvidia-smi fallback skipped if binary missing.
- **`probeMetric('fan-rpm')`**: first `fan1_input`; else `available:false`.
- **`probeMetric('cpu-voltages')`**: hwmon name match (`k10temp|zenpower|coretemp`); mV → V conversion; unavailable otherwise.
- **`toDisplayMetric`**: `formatBool(true|false)`; `formatRateBytes(0|1024|...)`.
- **Manifest channels**: 19 expected entries (current 11 + 8 new).
- **Frontend hooks**: each new channel name is referenced in both frontends (asserted via grep-style test or visual emulator check).

## 7. Assumptions

- `network` stub (interface count) remains available for existing configs; `network-read` / `network-write` are additive.
- NVIDIA fallback uses `execa` (already a CLI dependency via `action/executor.ts`); 100 ms timeout to keep poll cadence ≤ 1 s.
- `cpu-boost` source varies: `cpufreq/boost` for Intel, `intel_pstate/no_turbo` for pstate driver; probe reads in preference order and inverts pstate value.
- `disk-io` excludes loop (`/dev/loop*`), ramdisk (`/dev/ram*`), and dm-/md- devices to keep cloud-init scratch noise out.
- First-match preference for fans/voltages/GPU; per-device IDs (`disk-io:sda`, `fan:cpu`) deferred to a future plan.

## 8. Out of scope

- Windows / macOS implementations of the new metrics.
- Per-device metric IDs (`disk-io:sda`, `fan:cpu`, `voltage:vcore`).
- NVIDIA `nvidia-smi` parsing beyond `utilization.gpu` and `temperature.gpu` (memory, power, clocks deferred).
- UI for cycling between multi-card GPUs — only the first card is reported.
- Network monitoring over SNMP / IPMI / remote agents.
- Removing or replacing the legacy `network` (interface count) stub.
- Touching the `value-display`, `weather`, `media`, `brightness` addons.

## 9. Verification

Per AGENTS.md recipe:

```sh
pnpm lint && pnpm format && pnpm typecheck && pnpm test
pnpm --filter @sirenodeck/cli run dev -- --emulator
# open http://127.0.0.1:52938/#/device and http://127.0.0.1:5180
# confirm every new metric renders without console errors
# confirm unavailable metrics (e.g., GPU on a non-GPU box) show "—"
# confirm delta metrics (disk-io, network-rx, network-tx) move with activity
```

Capture a screenshot of the `sys-status-demo` deck for the PR body.
