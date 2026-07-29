# date-time

Time + date buttons. All refresh on a 1-second interval.

## Buttons

| Type                      | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `date-time:time`          | Digital time (HH:mm or big variant)                     |
| `date-time:date`          | Day + month + weekday                                   |
| `date-time:date-time`     | Combined date + time (custom format string)             |
| `date-time:analog-clock`  | SVG analog clock face                                   |

## Config

### `date-time:time`

```yaml
- position: 2
  type: date-time:time
  config:
    variant: big # "default" (HH:mm) or "big" (HH.mm)
```

### `date-time:date`

```yaml
- position: 3
  type: date-time:date
  config:
    locale: en-US # optional, defaults to "en-US"
    time_zone: Europe/Madrid # optional, defaults to local
```

### `date-time:date-time`

```yaml
- position: 5
  type: date-time:date-time
  config:
    format: "DD/MM/YYYY HH:mm:ss" # default; supports <markup> tags
```

### `date-time:analog-clock`

```yaml
- position: 4
  type: date-time:analog-clock # no config
```

## Example

```yaml
decks:
  main:
    name: Main
    buttons:
      - position: 2
        type: date-time:time
        config: { variant: big }
      - position: 3
        type: date-time:date
      - position: 4
        type: date-time:analog-clock
      - position: 5
        type: date-time:date-time
        config:
          format: "YYYY-MM-DD HH:mm"
```

## See also

- [system-status](../system-status/README.md) — uptime in the status button
