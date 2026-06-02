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

function createStoreScope(initialSnapshot?: unknown) {
  let snapshot = initialSnapshot

  return {
    clear() {
      snapshot = undefined
    },
    get snapshot() {
      return snapshot
    },
    set(value: unknown) {
      snapshot = value
    },
    update(updater: (current: unknown) => unknown) {
      snapshot = updater(snapshot)
    },
  }
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
      addon: createStoreScope(),
      button: createStoreScope(),
    },
    theme: {} as never,
  } as never)
}

function createMountedHarness(
  definition: NonNullable<(typeof dateTimeAddon.buttons)[number]>,
  config: unknown,
  position: number,
  methodOverrides: Partial<typeof mountedButtonMethods> = {},
) {
  const props = {
    button: { position, type: definition.type },
    config,
    frameState: 'idle',
    hostContext: UNKNOWN_HOST_CONTEXT,
    methods: { ...mountedButtonMethods, ...methodOverrides },
    pressed: false,
    store: {
      addon: createStoreScope(),
      button: createStoreScope(),
    },
    theme: {} as never,
  } as Parameters<typeof definition.render>[0]

  return {
    press: async () => definition.onPress?.(props),
    release: async () => definition.onRelease?.(props),
    render: () => definition.render(props),
    tap: async () => definition.onTap?.(props),
  }
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
    const clockDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'clock',
    )
    const lockedTimeTileDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'locked-time-tile',
    )
    const calendarDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'calendar-sheet',
    )
    const timeDefinition = dateTimeAddon.buttons.find(
      (definition) => definition.type === 'time',
    )
    const digitalConfig = digitalDefinition?.configSchema.parse({
      commands: { tap: 'date' },
    })
    const analogConfig = analogDefinition?.configSchema.parse({
      commands: { hold: 'uptime' },
    })
    const clockConfig = clockDefinition?.configSchema.parse({
      commands: { 'double-tap': 'cal' },
    })
    const calendarConfig = calendarDefinition?.configSchema.parse({
      commands: { tap: 'open-calendar' },
    })

    expect(dateTimeAddon.buttons.map((definition) => definition.type)).toEqual(
      expect.arrayContaining([
        'date-time',
        'locked-time-tile',
        'analog-clock',
        'clock',
        'calendar-sheet',
        'time',
      ]),
    )
    expect(digitalDefinition?.type).toBe('date-time')
    expect(digitalDefinition?.defaultIntervalMs).toBe(
      DIGITAL_DATE_TIME_INTERVAL_MS,
    )
    expect(digitalConfig).toEqual({
      commands: { tap: 'date' },
      format: 'DD/MM/YYYY|HH:mm:ss',
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
    expect(analogConfig).toEqual({ commands: { hold: 'uptime' } })

    expect(clockDefinition?.type).toBe('clock')
    expect(clockDefinition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    expect(clockConfig).toEqual({ commands: { 'double-tap': 'cal' } })

    expect(calendarDefinition?.type).toBe('calendar-sheet')
    expect(calendarDefinition?.defaultIntervalMs).toBe(
      CALENDAR_SHEET_INTERVAL_MS,
    )
    expect(calendarConfig).toEqual({ commands: { tap: 'open-calendar' } })

    expect(timeDefinition?.type).toBe('time')
    expect(timeDefinition?.defaultIntervalMs).toBe(DIGITAL_DATE_TIME_INTERVAL_MS)
  })

  it('formats token-based date and time labels from config strings', () => {
    const date = new Date(2026, 4, 14, 10, 48, 7)

    expect(formatDigitalDateTimeLabel('DD/MM/YYYY', date)).toBe('14/05/2026')

    expect(formatDigitalDateTimeLabel('HH:mm:ss', date)).toBe('10:48:07')

    expect(formatDigitalDateTimeLabel('DD/MM/YYYY|HH:mm:ss', date)).toBe(
      '14/05/2026|10:48:07',
    )

    expect(
      formatDigitalDateTimeLabel(
        '<accent><2xl>HH</2xl></accent><blink>:</blink><2xl>mm</2xl>|<xs>DD/MMM</xs>',
        date,
      ),
    ).toBe('<accent><2xl>10</2xl></accent><blink>:</blink><2xl>48</2xl>|<xs>14/May</xs>')

    expect(
      formatDigitalDateTimeLabel(
        'Broken <accent><danger>HH:mm</accent></danger>',
        date,
      ),
    ).toBe('Broken <accent><danger>10:48</accent></danger>')

    expect(formatDigitalDateTimeLabel('Broken <accent HH:mm', date)).toBe(
      'Broken <accent 10:48',
    )
  })

  it('creates a renderable live date-time surface through the mounted contract', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 7))

    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'date-time',
    )

    const html = renderReactNodeToHtml(
      renderMountedDefinition(
        definition!,
        {
          format: '<accent><2xl>HH</2xl></accent><blink>:</blink><2xl>mm</2xl>|<xs>DD/MMM</xs>',
        },
        2,
      ) as never,
    )

    expect(html).toContain('>10<')
    expect(html).toContain('data-sireno-rich-text-tag="blink">:</span>')
    expect(html).toContain('>48<')
    expect(html).toContain('w-full')
    expect(html).toContain('data-sireno-ui-text="true"')
    expect(html).toContain('data-sireno-text-size="xl"')
    expect(html).toContain('font-main')
    expect(html).toContain('text-foreground')
    expect(html).toContain('data-sireno-rich-text-tag="accent"')
    expect(html).toContain('data-sireno-rich-text-tag="2xl"')
    expect(html).toContain('data-sireno-rich-text-tag="line-break"')
    expect(html).toContain('data-sireno-rich-text-tag="blink"')
    expect(html).toContain('data-sireno-rich-text-tag="xs"')
    expect(html).toContain('text-2xl')

    vi.useRealTimers()
  })

  it('falls back to literal output when formatted date-time markup is invalid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 7))

    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'date-time',
    )

    const html = renderReactNodeToHtml(
      renderMountedDefinition(
        definition!,
        {
          format: 'Broken <accent><danger>HH:mm</accent></danger>',
        },
        2,
      ) as never,
    )

    expect(html).toContain('Broken &lt;accent&gt;&lt;danger&gt;10:48&lt;/accent&gt;&lt;/danger&gt;')
    expect(html).not.toContain('data-sireno-rich-text-tag="accent"')

    const unmatchedHtml = renderReactNodeToHtml(
      renderMountedDefinition(
        definition!,
        {
          format: 'Broken <accent HH:mm',
        },
        2,
      ) as never,
    )

    expect(unmatchedHtml).toContain('Broken &lt;accent 10:48')
    expect(unmatchedHtml).not.toContain('data-sireno-rich-text-tag="accent"')

    vi.useRealTimers()
  })

  it('creates a renderable locked time tile surface for implicit lock fallback digits and colon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 9, 8, 7))

    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'locked-time-tile',
    )
    const digitHtml = renderReactNodeToHtml(
      renderMountedDefinition(definition!, { slot: 'hour' }, 5) as never,
    )
    const colonHtml = renderReactNodeToHtml(
      renderMountedDefinition(definition!, { slot: 'separator' }, 7) as never,
    )

    expect(digitHtml).toContain('09')
    expect(digitHtml).toContain('font-mono text-primary')
    expect(digitHtml).toContain('data-sireno-text-size="2xl"')
    expect(colonHtml).toContain(':')
    expect(colonHtml).toContain('font-mono text-accent')

    vi.useRealTimers()
  })

  it('formats the implicit locked fallback as live HH:MM characters', () => {
    const date = new Date(2026, 4, 14, 9, 8, 7)

    expect(formatLockedTimeCharacters(date)).toEqual(['09', ':', '08'])
    expect(formatLockedTimeTileCharacter('hour', date)).toBe('09')
    expect(formatLockedTimeTileCharacter('separator', date)).toBe(':')
    expect(formatLockedTimeTileCharacter('minute', date)).toBe('08')
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
    expect(html).toContain('ANALOG')
    expect(html).toContain('font-aux text-foreground')
    expect(html).toContain('rounded-[16px] border border-white/10')
    expect(html).toContain('tracking-[0.22em] opacity-70')
  })

  it('keeps the shipped clock aliases on the bundled analog clock type', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )
    const clockDefinition = dateTimeAddon.buttons.find(
      (button) => button.type === 'clock',
    )

    expect(definition?.type).toBe('analog-clock')
    expect(definition?.defaultIntervalMs).toBe(1000)
    expect(definition?.configSchema.parse({})).toEqual({})
    expect(clockDefinition?.type).toBe('clock')
    expect(clockDefinition?.defaultIntervalMs).toBe(1000)
    expect(clockDefinition?.configSchema.parse({})).toEqual({})
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
    expect(html).toContain('gap-1')
  })

  it('runs shared tap commands on regular digital date-time buttons', async () => {
    vi.useFakeTimers()

    try {
      const definition = dateTimeAddon.buttons.find(
        (button) => button.type === 'date-time',
      )
      const runCommand = vi.fn(async () => ({}) as never)
      const harness = createMountedHarness(
        definition!,
        { commands: { tap: 'date' } },
        2,
        { runCommand },
      )

      const tapPromise = harness.tap()
      await vi.advanceTimersByTimeAsync(300)
      await tapPromise

      expect(runCommand).toHaveBeenCalledTimes(1)
      expect(runCommand).toHaveBeenCalledWith('date')
    } finally {
      vi.useRealTimers()
    }
  })

  it('runs hold instead of tap on regular time buttons', async () => {
    vi.useFakeTimers()

    try {
      const definition = dateTimeAddon.buttons.find(
        (button) => button.type === 'time',
      )
      const runCommand = vi.fn(async () => ({}) as never)
      const harness = createMountedHarness(
        definition!,
        {
          commands: { hold: 'uptime', tap: 'date' },
          variant: 'big',
        },
        3,
        { runCommand },
      )

      await harness.press()
      await vi.advanceTimersByTimeAsync(650)
      await harness.release()
      await harness.tap()

      expect(runCommand).toHaveBeenCalledTimes(1)
      expect(runCommand).toHaveBeenCalledWith('uptime')
    } finally {
      vi.useRealTimers()
    }
  })

  it('suppresses tap and runs double-tap on the regular clock alias', async () => {
    vi.useFakeTimers()

    try {
      const definition = dateTimeAddon.buttons.find(
        (button) => button.type === 'clock',
      )
      const runCommand = vi.fn(async () => ({}) as never)
      const harness = createMountedHarness(
        definition!,
        {
          commands: { 'double-tap': 'calendar', tap: 'time' },
        },
        4,
        { runCommand },
      )

      const firstTap = harness.tap()
      await vi.advanceTimersByTimeAsync(100)
      const secondTap = harness.tap()
      await secondTap
      await firstTap

      expect(runCommand).toHaveBeenCalledTimes(1)
      expect(runCommand).toHaveBeenCalledWith('calendar')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps locked time tiles outside the shared command rollout', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'locked-time-tile',
    )

    expect(
      definition?.configSchema.safeParse({
        commands: { tap: 'date' },
        slot: 'hour',
      }).success,
    ).toBe(false)
    expect(definition?.onPress).toBeUndefined()
    expect(definition?.onRelease).toBeUndefined()
    expect(definition?.onTap).toBeUndefined()
  })
})
