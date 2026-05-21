import { describe, expect, it, vi } from 'vitest'

import { isAddonDomButtonRender } from '../../addon/api.js'
import { createHostedButtonElement, renderReactNodeToHtml } from '../../render/dom-host.js'
import dateTimeAddon, {
  ANALOG_CLOCK_INTERVAL_MS,
  CALENDAR_SHEET_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 7))

    const instance = definition?.createInstance({
      button: { position: 2 },
      config: {
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        variant: 'date-time',
      },
    } as never)
    const renderResult = instance?.render()

    expect(isAddonDomButtonRender(renderResult)).toBe(true)
    expect(renderResult).toMatchObject({ keyIndex: 2 })
    expect(renderReactNodeToHtml(createHostedButtonElement(renderResult!))).toContain('data-sireno-button-frame="true"')
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('data-sireno-date-time="digital"')
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('05/14/2026')
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('10:48:07')

    vi.useRealTimers()
  })

  it('creates a renderable analog clock button instance with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'analog-clock',
    )
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: {},
    } as never)
    const renderResult = instance?.render()

    expect(definition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    expect(isAddonDomButtonRender(renderResult)).toBe(true)
    expect(renderResult).toMatchObject({ keyIndex: 4 })
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('data-sireno-date-time="analog-clock"')
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 7))
    const renderResult = instance?.render()

    expect(definition?.defaultIntervalMs).toBe(CALENDAR_SHEET_INTERVAL_MS)
    expect(isAddonDomButtonRender(renderResult)).toBe(true)
    expect(renderResult).toMatchObject({ keyIndex: 6 })
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('data-sireno-date-time="calendar-sheet"')
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('MAY')
    expect(renderReactNodeToHtml(renderResult?.content)).toContain('14')

    vi.useRealTimers()
  })

  it('renders updated live time content on subsequent renders', () => {
    const definition = dateTimeAddon.buttons.find(
      (button) => button.type === 'date-time',
    )
    const instance = definition?.createInstance({
      button: { position: 1 },
      config: {
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        variant: 'time',
      },
    } as never)

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 7))
    const firstRender = renderReactNodeToHtml(instance?.render().content)

    vi.setSystemTime(new Date(2026, 4, 14, 10, 48, 8))
    const secondRender = renderReactNodeToHtml(instance?.render().content)

    expect(firstRender).toContain('10:48:07')
    expect(secondRender).toContain('10:48:08')

    vi.useRealTimers()
  })
})
