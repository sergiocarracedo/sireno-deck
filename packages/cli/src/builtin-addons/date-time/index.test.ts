import { describe, expect, it, vi } from 'vitest'

import { UNKNOWN_HOST_CONTEXT } from '../../system/host-context.js'
import { renderReactNodeToHtml } from '../../render/dom-host.js'
import dateTimeAddon, {
  ANALOG_CLOCK_INTERVAL_MS,
  CALENDAR_SHEET_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
} from './index.js'

const noopStoreScope = {
  clear() {},
  get snapshot() {
    return undefined
  },
  set() {},
  update() {},
}

const mountedButtonMethods = {
  getActiveDeckId: () => 'main',
  goBack() {},
  invalidate() {},
  navigateToDeck() {},
  runCommand: async () => ({}) as never,
}

function renderMountedDefinition(
  definition: NonNullable<(typeof dateTimeAddon.buttons)[number]>,
  config: unknown,
  position: number,
) {
  return definition.render({
    button: { position, type: definition.type },
    config,
    frameState: 'idle',
    hostContext: UNKNOWN_HOST_CONTEXT,
    methods: mountedButtonMethods,
    pressed: false,
    store: {
      addon: noopStoreScope,
      button: noopStoreScope,
    },
    theme: {} as never,
  } as never)
}

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

  it('creates a renderable live date-time surface through the mounted contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'date-time',
    )

    expect(renderReactNodeToHtml(renderMountedDefinition(
      definition!,
      {
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        variant: 'date-time',
      },
      2,
    ) as never)).toContain('/')
  })

  it('creates a renderable locked time tile surface for implicit lock fallback digits and colon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 9, 8, 7))

    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'locked-time-tile',
    )
    const digitHtml = renderReactNodeToHtml(
      renderMountedDefinition(definition!, { slot: 'hour-tens' }, 5) as never,
    )
    const colonHtml = renderReactNodeToHtml(
      renderMountedDefinition(definition!, { slot: 'separator' }, 7) as never,
    )

    expect(digitHtml).toContain('0')
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

  it('creates a renderable analog clock button surface with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )

    expect(definition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    const html = renderReactNodeToHtml(
      renderMountedDefinition(definition!, {}, 4) as never,
    )

    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('Clock')
    expect(html).toContain('font-main text-primary')
    expect(html).toContain('font-aux text-foreground')
  })

  it('keeps the shipped Phase 8 review contract on the bundled analog clock type', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )

    expect(definition?.type).toBe('analog-clock')
    expect(definition?.defaultIntervalMs).toBe(1000)
    expect(definition?.configSchema.parse({})).toEqual({})
  })

  it('creates a renderable calendar-sheet button surface with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'calendar-sheet',
    )

    expect(definition?.defaultIntervalMs).toBe(CALENDAR_SHEET_INTERVAL_MS)
    const html = renderReactNodeToHtml(
      renderMountedDefinition(definition!, {}, 6) as never,
    )

    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('Date')
    expect(html).toContain('font-main text-foreground')
    expect(html).toContain('font-aux text-accent')
  })
})
