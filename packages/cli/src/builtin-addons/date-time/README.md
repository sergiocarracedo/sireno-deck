# date-time

Time + date buttons. All refresh on a 1-second interval.

## Buttons

| Type                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `core:time`              | Digital time (HH:mm or big variant)                      |
| `core:date`              | Day + month + weekday                                    |
| `core:clock`             | 12-hour digital clock (with optional seconds)            |
| `core:analog-clock`      | SVG analog clock face                                     |
| `core:date-time`         | Combined date + time (custom format string)              |
| `core:locked-time-tile`  | Single tile for one HH:MM character (e.g. big displays)  |

## Config

### `core:time`

```yaml
- position: 2
  type: core:time
  config:
    variant: big        # "default" (HH:mm) or "big" (HH.mm)
```

### `core:date`

```yaml
- position: 3
  type: core:date
  config:
    locale: en-US         # optional, defaults to "en-US"
    time_zone: Europe/Madrid   # optional, defaults to local
```

### `core:clock`

```yaml
- position: 13
  type: core:clock
  config:
    showSeconds: false    # optional, default false
    time_zone: Europe/Madrid   # optional
```

### `core:date-time`

```yaml
- position: 5
  type: core:date-time
  config:
    format: "DD/MM/YYYY HH:mm:ss"   # default; supports <markup> tags
```

### `core:analog-clock`

```yaml
- position: 4
  type: core:analog-clock    # no config
```

### `core:locked-time-tile`

```yaml
- position: 0
  type: core:locked-time-tile
  config:
    slot: hour-tens          # one of: hour, hour-tens, hour-ones, separator, minute, minute-tens, minute-ones
```

## Example

```yaml
decks:
  main:
    name: Main
    buttons:
      - position: 2
        type: core:time
        config: { variant: big }
      - position: 3
        type: core:date
      - position: 4
        type: core:analog-clock
      - position: 5
        type: core:date-time
        config:
          format: "YYYY-MM-DD HH:mm"
      - position: 13
        type: core:clock
        config:
          showSeconds: true
```

## See also

- [system-status](../system-status/README.md) — uptime in the status button
