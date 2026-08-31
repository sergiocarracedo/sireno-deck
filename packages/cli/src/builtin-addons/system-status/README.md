# system-status

OS metrics as Stream Deck buttons. Three visual modes — horizontal bars, a
KPIs list, and a mini-chart — and 19 built-in metrics. Polls every second via
addon-global pollers per metric, publishes on `runtime:system-status:<id>`,
and chart history on `runtime:system-status:chart-history`.

## Buttons

| Type                          | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `system-status:system-status` | 1–3 metrics rendered as horizontal bars + value chips |

> The `bars`, `kpis`, and `chart` layouts are pages within this single button
> type, not separate button types.

## Config

```yaml
- position: 5
  type: "system-status:system-status"
  config:
    pages:
      - type: bars
        metrics:
          - id: cpu
            label: CPU
          - id: ram
            label: MEM
          - swap
      - type: kpis
        metrics: [temperature, uptime]
```

`metrics` accepts either a string id (`"cpu"`) or an object
(`{id: "cpu", label: "CPU"}`). At least one, at most three.

### Page layouts

The single registered button type accepts up to five `pages`. Each page has one
of three layouts:

| Layout  | Metric count | Notes                                      |
| ------- | ------------ | ------------------------------------------ |
| `bars`  | 1–3          | Horizontal bars + value chips              |
| `kpis`  | 1–3          | Label/value list                           |
| `chart` | 1–2          | Metrics plotted over a sliding time window |

```yaml
- position: 6
     type: "system-status:system-status"
     config:
     pages:
       - type: kpis
         metrics: [cpu, ram]
```

`chart` supports an optional `windowSeconds` (default 60); the per-metric
history is published on a dedicated
`runtime:system-status:chart-history` channel, separate from the live
metric channels.

## Metrics

| Id              | Label (default) | Formatter     | Unit | Views             | Source                                                                            |
| --------------- | --------------- | ------------- | ---- | ----------------- | --------------------------------------------------------------------------------- |
| `cpu`           | CPU             | percent       | %    | bars, chart, kpis | `/proc` jiffies delta over poll interval                                          |
| `ram`           | RAM             | percent       | %    | bars, chart, kpis | `os.totalmem/freemem`                                                             |
| `swap`          | Swap            | percent       | %    | bars, chart, kpis | `/proc/meminfo` SwapTotal/SwapFree (Linux)                                        |
| `disk`          | Disk            | percent       | %    | bars, chart, kpis | `statfs("/")` used/total                                                          |
| `disk-io`       | Disk I/O        | rate-bytes    | B/s  | kpis              | `/proc/diskstats` sector delta × 512 (Linux)                                      |
| `network`       | Net             | count         | —    | kpis              | Interface count (placeholder — see `network-read` / `network-write`)              |
| `network-read`  | Net RX          | rate-bytes    | B/s  | kpis              | `/sys/class/net/*/statistics/rx_bytes` delta, non-loopback (Linux)                |
| `network-write` | Net TX          | rate-bytes    | B/s  | kpis              | `/sys/class/net/*/statistics/tx_bytes` delta, non-loopback (Linux)                |
| `battery`       | Battery         | percent       | %    | bars, chart, kpis | `/sys/class/power_supply/BAT0/capacity` (Linux)                                   |
| `temperature`   | Temp            | count         | °C   | bars, chart, kpis | `/sys/class/thermal/thermal_zone0/temp` (Linux)                                   |
| `gpu-temp`      | GPU Temp        | count         | °C   | bars, chart, kpis | amdgpu sysfs, fallback `nvidia-smi --query-gpu=temperature.gpu`                   |
| `gpu-usage`     | GPU             | percent       | %    | bars, chart, kpis | amdgpu `gpu_busy_percent`, fallback `nvidia-smi --query-gpu=utilization.gpu`      |
| `uptime`        | Uptime          | uptime        | —    | kpis              | `os.uptime()`                                                                     |
| `frequency`     | Freq            | frequency-ghz | GHz  | bars, chart, kpis | `os.cpus()[].speed`, fallback `/proc/cpuinfo` MHz                                 |
| `load`          | Load            | count         | —    | bars, chart, kpis | `os.loadavg()[0]`                                                                 |
| `processes`     | Procs           | count         | —    | kpis              | `/proc` numeric-dir count (Linux)                                                 |
| `cpu-boost`     | Boost           | bool          | —    | kpis              | `/sys/devices/system/cpu/cpufreq/boost`, fallback `intel_pstate/no_turbo` (Linux) |
| `cpu-voltages`  | Vcore           | count         | V    | kpis              | hwmon `in0_input` on k10temp/zenpower/coretemp/acpitz (Linux)                     |
| `fan-rpm`       | Fan             | count         | RPM  | kpis              | hwmon `fan*_input` first non-zero reading (Linux)                                 |

Metrics that aren't available on the current platform (most probes are
Linux-only) report `available: false` and the button renders a `—` for that
slot. No silent zeros, no crashes.

### Formatters

| Formatter       | Output                                    |
| --------------- | ----------------------------------------- |
| `percent`       | `5.4%` (<10) / `42%` (≥10)                |
| `count`         | `42` (≥100) / `5.4` (<100)                |
| `bytes`         | `5.2 MB`                                  |
| `rate-bytes`    | `5.2 MB/s` (uses KiB/MiB/GiB/TiB scaling) |
| `frequency-ghz` | `3.40`                                    |
| `uptime`        | `2h`                                      |
| `bool`          | `ON` (≥0.5) / `OFF`                       |

## Example

```yaml
decks:
  sys:
    name: Sys Stats
    buttons:
      - position: 0
        type: "system-status:system-status"
         config:
           pages:
             - type: bars
               metrics:
                 - id: cpu
                   label: CPU
                 - id: ram
                   label: MEM
                 - swap
       - position: 1
         type: "system-status:system-status"
         config:
           pages:
             - type: kpis
               metrics: [disk-io, network-read, network-write]
       - position: 2
         type: "system-status:system-status"
         config:
           pages:
             - type: kpis
               metrics: [cpu-boost, cpu-voltages, fan-rpm]
```

## See also

- [media](../media/README.md) — same addon pattern (no config, polls OS)
- [brightness](../brightness/README.md) — same polling pattern; brightness is
  just a one-button metric
- [value-display](../value-display/README.md) — same polling pattern, but
  for built-in OS metrics via shell commands
- [date-time](../date-time/README.md) — sibling addon for time/date buttons
