# weather

Current weather for a fixed location. Hits Open-Meteo (https://open-meteo.com/) every 10 minutes (configurable). No API key required.

## Buttons

| Type           | Description                                            |
| -------------- | ------------------------------------------------------ |
| `core:weather` | Single button: temperature, wind speed, conditions     |

## Config

```yaml
- position: 4
  type: core:weather
  config:
    location:
      latitude: 42.2304
      longitude: -8.7256
      name: Vigo        # optional, shown in the button label
    units: metric        # "metric" (default) or "imperial"
    poll_interval_ms: 600000   # optional, default 10 min
```

If `location` is omitted, the button renders a "Configure weather" placeholder.

WMO weather codes (https://open-meteo.com/en/docs) are mapped to descriptions: clear sky, partly cloudy, overcast, fog, drizzle, rain, freezing rain, snow, thunderstorm, etc.

## Example

```yaml
- position: 4
  type: core:weather
  config:
    location:
      latitude: 40.4168
      longitude: -3.7038
      name: Madrid
    units: metric
```

Run `curl "https://api.open-meteo.com/v1/forecast?latitude=40.4&longitude=-3.7&current=temperature_2m"` to verify the API is reachable from your network.

## See also

- [value-display](../value-display/README.md) — `core:value-display` for arbitrary command output (no API)
