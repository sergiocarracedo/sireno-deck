# system-status

OS metrics as Stream Deck buttons. Three visual modes — horizontal bars, a
KPIs list, and a mini-chart — and 19 built-in metrics. Polls every second via
addon-global pollers per metric, publishes on `runtime:system-status:<id>`,
and chart history on `runtime:system-status:chart-history`.

## Buttons

| Type                          | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `system-status:system-status` | 1–3 metrics rendered as horizontal bars + value chips |
| `system-status:kpis`          | 1–3 metrics rendered as a label/value list            |
| `system-status:chart`         | 1–2 metrics plotted as a real-time line chart         |

## Config

```yaml
- position: 5
  type: "system-status:system-status"
  config:
    metrics:
      - id: cpu
        label: CPU
      - id: ram
        label: MEM
      - swap
    pollInterval: 1000 # optional, default 1000ms
    renderInterval: 1000 # optional, default 1000ms
    formatters: # optional per-metric override
      cpu: percent
    labels: # optional shorthand for `metrics: [{id, label}]`
      cpu: CPU
```

`metrics` accepts either a string id (`"cpu"`) or an object
(`{id: "cpu", label: "CPU"}`). At least one, at most three.

### KPIs variant

```yaml
- position: 6
  type: "system-status:kpis"
  config:
    metrics:
      - id: cpu
      - id: ram
      - disk
```

### Chart variant

```yaml
- position: 7
  type: "system-status:chart"
  config:
    metrics:
      - id: cpu
      - id: ram
    windowSeconds: 60 # optional, default 60
```

Chart supports 1–2 metrics plotted over a sliding time window. The history is
published on a dedicated `runtime:system-status:chart-history` channel,
separate from the live metric channels.

## Metrics

| Id              | Label (default) | Formatter     | Unit | Views      | Source                                                                            |
| --------------- | --------------- | ------------- | ---- | ---------- | --------------------------------------------------------------------------------- |
| `cpu`           | CPU             | percent       | %    | bars, kpis | `/proc` jiffies delta over poll interval                                          |
| `ram`           | RAM             | percent       | %    | bars, kpis | `os.totalmem/freemem`                                                             |
| `swap`          | Swap            | percent       | %    | bars, kpis | `/proc/meminfo` SwapTotal/SwapFree (Linux)                                        |
| `disk`          | Disk            | percent       | %    | bars, kpis | `statfs("/")` used/total                                                          |
| `disk-io`       | Disk I/O        | rate-bytes    | B/s  | kpis       | `/proc/diskstats` sector delta × 512 (Linux)                                      |
| `network`       | Net             | count         | —    | kpis       | Interface count (placeholder — see `network-read` / `network-write`)              |
| `network-read`  | Net RX          | rate-bytes    | B/s  | kpis       | `/sys/class/net/*/statistics/rx_bytes` delta, non-loopback (Linux)                |
| `network-write` | Net TX          | rate-bytes    | B/s  | kpis       | `/sys/class/net/*/statistics/tx_bytes` delta, non-loopback (Linux)                |
| `battery`       | Battery         | percent       | %    | bars, kpis | `/sys/class/power_supply/BAT0/capacity` (Linux)                                   |
| `temperature`   | Temp            | count         | °C   | bars, kpis | `/sys/class/thermal/thermal_zone0/temp` (Linux)                                   |
| `gpu-temp`      | GPU Temp        | count         | °C   | bars, kpis | amdgpu sysfs, fallback `nvidia-smi --query-gpu=temperature.gpu`                   |
| `gpu-usage`     | GPU             | percent       | %    | bars, kpis | amdgpu `gpu_busy_percent`, fallback `nvidia-smi --query-gpu=utilization.gpu`      |
| `uptime`        | Uptime          | uptime        | —    | kpis       | `os.uptime()`                                                                     |
| `frequency`     | Freq            | frequency-ghz | GHz  | bars, kpis | `os.cpus()[].speed`, fallback `/proc/cpuinfo` MHz                                 |
| `load`          | Load            | count         | —    | bars, kpis | `os.loadavg()[0]`                                                                 |
| `processes`     | Procs           | count         | —    | kpis       | `/proc` numeric-dir count (Linux)                                                 |
| `cpu-boost`     | Boost           | bool          | —    | kpis       | `/sys/devices/system/cpu/cpufreq/boost`, fallback `intel_pstate/no_turbo` (Linux) |
| `cpu-voltages`  | Vcore           | count         | V    | kpis       | hwmon `in0_input` on k10temp/zenpower/coretemp/acpitz (Linux)                     |
| `fan-rpm`       | Fan             | count         | RPM  | kpis       | hwmon `fan*_input` first non-zero reading (Linux)                                 |

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
          metrics:
            - id: cpu
              label: CPU
            - id: ram
              label: MEM
            - swap
      - position: 1
        type: "system-status:kpis"
        config:
          metrics: [disk-io, network-read, network-write]
      - position: 2
        type: "system-status:kpis"
        config:
          metrics: [cpu-boost, cpu-voltages, fan-rpm]
```

## See also

- [media](../media/README.md) — same addon pattern (no config, polls OS)
- [brightness](../brightness/README.md) — same polling pattern; brightness is
  just a one-button metric
- [value-display](../value-display/README.md) — same polling pattern, but
  for built-in OS metrics via shell commands
- [date-time](../date-time/README.md) — sibling addon for time/date buttons
