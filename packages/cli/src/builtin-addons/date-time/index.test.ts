import { describe, expect, it, vi } from 'vitest'

import { renderReactNodeToHtml } from '../../render/dom-host.js'
import dateTimeAddon, {
  ANALOG_CLOCK_INTERVAL_MS,
  CALENDAR_SHEET_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
} from './index.js'

describe('date-time addon', () => {
  it('exports bundled digital, analog, and calendar button definitions with strict schemas', () => {
    expect(dateTimeAddon.name).toBe('date-time')
    expect(dateTimeAddon.apiVersion).toBe(1)

    const digitalDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'date-time',
    )
    const analogDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'analog-clock',
    )
    const lockedTimeTileDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'locked-time-tile',
    )
    const calendarDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'calendar-sheet',
    )
    const digitalConfig = digitalDefinition?.configSchema.parse({
      variant: 'date-time',
    })
    const analogConfig = analogDefinition?.configSchema.parse({})
    const calendarConfig = calendarDefinition?.configSchema.parse({})

    expect(dateTimeAddon.buttons.map((definition) => definition.type)).toEqual([
      'date-time',
      'locked-time-tile',
      'analog-clock',
      'calendar-sheet',
    ])
    expect(digitalDefinition?.type).toBe('date-time')
    expect(digitalDefinition?.defaultIntervalMs).toBe(
      DIGITAL_DATE_TIME_INTERVAL_MS,
    )
    expect(digitalConfig).toEqual({
      date_format: 'MM/DD/YYYY',
      time_format: 'HH:mm:ss',
      variant: 'date-time',
    })

    expect(lockedTimeTileDefinition?.type).toBe('locked-time-tile')
    expect(lockedTimeTileDefinition?.defaultIntervalMs).toBe(
      DIGITAL_DATE_TIME_INTERVAL_MS,
    )
    expect(lockedTimeTileDefinition?.configSchema.parse({ slot: 'separator' })).toEqual({
      slot: 'separator',
    })

    expect(analogDefinition?.type).toBe('analog-clock')
    expect(analogDefinition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    expect(analogConfig).toEqual({})

    expect(calendarDefinition?.type).toBe('calendar-sheet')
    expect(calendarDefinition?.defaultIntervalMs).toBe(
      CALENDAR_SHEET_INTERVAL_MS,
    )
    expect(calendarConfig).toEqual({})
  })

  it('formats token-based date and time labels from config strings', () => {
    const date = new Date(2026, 4, 14, 10, 48, 7)

    expect(
      formatDigitalDateTimeLabel(
        {
          date_format: 'DD/MM/YYYY',
          time_format: 'HH:mm:ss',
          variant: 'date',
        },
        date,
      ),
    ).toBe('14/05/2026')

    expect(
      formatDigitalDateTimeLabel(
        {
          date_format: 'DD/MM/YYYY',
          time_format: 'HH:mm:ss',
          variant: 'time',
        },
        date,
      ),
    ).toBe('10:48:07')

    expect(
      formatDigitalDateTimeLabel(
        {
          date_format: 'DD/MM/YYYY',
          time_format: 'HH:mm:ss',
          variant: 'date-time',
        },
        date,
      ),
    ).toBe('14/05/2026 10:48:07')
  })

  it('creates a renderable live date-time button instance', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'date-time',
    )
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: {
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        variant: 'date-time',
      },
    } as never)

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('/')
  })

  it('creates a renderable locked time tile instance for implicit lock fallback digits and colon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 9, 8, 7))

    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'locked-time-tile',
    )
    const digitInstance = definition?.createInstance({
      button: { position: 5 },
      config: { slot: 'hour-tens' },
    } as never)
    const colonInstance = definition?.createInstance({
      button: { position: 7 },
      config: { slot: 'separator' },
    } as never)

    const digitHtml = renderReactNodeToHtml(digitInstance?.render() as never)
    const colonHtml = renderReactNodeToHtml(colonInstance?.render() as never)

    expect(digitHtml).toContain('1')
    expect(digitHtml).toContain('font-mono text-primary')
    expect(colonHtml).toContain(':')
    expect(colonHtml).toContain('font-mono text-accent')

    vi.useRealTimers()
  })

  it('formats the implicit locked fallback as live HH:MM characters', () => {
    const date = new Date(2026, 4, 14, 9, 8, 7)

    expect(formatLockedTimeCharacters(date)).toEqual(['0', '9', ':', '0', '8'])
    expect(formatLockedTimeTileCharacter('hour-tens', date)).toBe('0')
    expect(formatLockedTimeTileCharacter('hour-ones', date)).toBe('9')
    expect(formatLockedTimeTileCharacter('separator', date)).toBe(':')
    expect(formatLockedTimeTileCharacter('minute-tens', date)).toBe('0')
    expect(formatLockedTimeTileCharacter('minute-ones', date)).toBe('8')
  })

  it('creates a renderable analog clock button instance with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: {},
    } as never)
    const element = instance?.render()

    expect(definition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    const html = renderReactNodeToHtml(element as never)

    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('Clock')
    expect(html).toContain('class="font-main text-primary"')
    expect(html).toContain('class="font-aux text-foreground"')
  })

  it('keeps the shipped Phase 8 review contract on the bundled analog clock type', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )

    expect(definition?.type).toBe('analog-clock')
    expect(definition?.defaultIntervalMs).toBe(1000)
    expect(definition?.configSchema.parse({})).toEqual({})
  })

  it('creates a renderable calendar-sheet button instance with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'calendar-sheet',
    )
    const instance = definition?.createInstance({
      button: { position: 6 },
      config: {},
    } as never)
    const element = instance?.render()

    expect(definition?.defaultIntervalMs).toBe(CALENDAR_SHEET_INTERVAL_MS)
    const html = renderReactNodeToHtml(element as never)

    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('Date')
    expect(html).toContain('class="font-main text-foreground"')
    expect(html).toContain('class="font-aux text-accent"')
  })
})
