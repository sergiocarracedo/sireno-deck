# value-display

Run shell commands and show their output. Useful for showing disk usage, git status, weather (without Open-Meteo), battery percentage (Linux), etc.

Each button has up to 4 `values` entries; each entry runs a command via the action executor and shows its output.

## Buttons

| Type                 | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `core:value-display` | Single button: shows N values (label + command output) |

## Config

```yaml
- position: 6
  type: core:value-display
  config:
    poll_interval_ms: 5000 # optional, default 5000
    timeout_ms: 5000 # optional, default 5000 (per command)
    values:
      - label: Disk
        command: "df -h / | tail -1 | awk '{print $5}'"
        formatter: strip # "raw" (default), "strip", or "line"
        units: "%"
      - label: Uptime
        command: "uptime -p"
        formatter: strip
      - label: CPU Temp
        command: "sensors | grep 'Core 0' | awk '{print $3}'"
        timeout_ms: 2000
```

### Formatters

| Formatter | Behavior                                            |
| --------- | --------------------------------------------------- |
| `raw`     | Output the command's stdout verbatim                |
| `strip`   | Trim leading/trailing whitespace                    |
| `line`    | Take only the first non-empty line, trim whitespace |

## Example

```yaml
- position: 6
  type: core:value-display
  config:
    values:
      - label: Disk
        command: "df -h / | tail -1 | awk '{print $5}'"
        units: "%"
      - label: CPU Temp
        command: "sensors | grep 'Core 0' | awk '{print $3}'"
```

## See also

- [weather](../weather/README.md) — `core:weather` is a wrapper around Open-Meteo; `core:value-display` is the manual version
- [system-status](../system-status/README.md) — same polling pattern, but for built-in OS metrics
