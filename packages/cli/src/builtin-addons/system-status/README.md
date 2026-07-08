# system-status

One button per metric configuration. Renders OS metrics (CPU, RAM, swap, fan, uptime, battery, load avg) polled every second (configurable).

## Buttons

| Type                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `core:system-status` | Single button: shows N metrics in text or bars layout |

## Config

```yaml
- position: 0
  type: core:system-status
  config:
    variant: bars # "text" (default) or "bars"
    poll_interval_ms: 1000 # optional, default 1000
    metrics:
      - metric: cpu_usage
        label: CPU
        max_value: 100 # optional, for bars
        color: "#38bdf8" # optional, for bars
      - metric: memory_usage
        label: RAM
      - metric: swap_usage
        label: Swap
        unavailable_label: "N/A"
      - metric: battery # Linux only; graceful fallback
        label: Battery
      - metric: uptime
        label: Uptime
```

Available metrics:

| Metric id         | Source                                     |
| ----------------- | ------------------------------------------ |
| `cpu_usage`       | `os.cpus()` delta over poll interval       |
| `memory_usage`    | `os.totalmem()` − `os.freemem()`           |
| `swap_usage`      | `/proc/meminfo` (Linux)                    |
| `fan_speed`       | `/sys/class/hwmon` (Linux best-effort)     |
| `uptime`          | `os.uptime()` formatted as days/hours/mins |
| `battery`         | `/sys/class/power_supply/BAT0` (Linux)     |
| `load_average_1m` | `os.loadavg()[0]`                          |

## Example

```yaml
- position: 0
  type: core:system-status
  config:
    variant: bars
    metrics:
      - { metric: cpu_usage, label: CPU }
      - { metric: memory_usage, label: RAM }
      - { metric: uptime, label: Uptime }
```

## See also

- [Brightness](../brightness/README.md) — same polling pattern (no config needed)
