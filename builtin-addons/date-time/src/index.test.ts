import { describe, expect, it } from 'vitest'

import dateTimeAddon, {
  ANALOG_CLOCK_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
} from './index.js'

describe('date-time addon', () => {
  it('exports bundled digital and analog clock button definitions with strict schemas', () => {
    expect(dateTimeAddon.name).toBe('date-time')
    expect(dateTimeAddon.apiVersion).toBe(1)

    const digitalDefinition = dateTimeAddon.buttons.find((definition) => definition.type === 'date-time')
    const analogDefinition = dateTimeAddon.buttons.find((definition) => definition.type === 'analog-clock')
    const digitalConfig = digitalDefinition?.configSchema.parse({ variant: 'date-time' })
    const analogConfig = analogDefinition?.configSchema.parse({})

    expect(dateTimeAddon.buttons.map((definition) => definition.type)).toEqual(['date-time', 'analog-clock'])
    expect(digitalDefinition?.type).toBe('date-time')
    expect(digitalDefinition?.defaultIntervalMs).toBe(DIGITAL_DATE_TIME_INTERVAL_MS)
    expect(digitalConfig).toEqual({
      date_format: 'MM/DD/YYYY',
      time_format: 'HH:mm:ss',
      variant: 'date-time',
    })

    expect(analogDefinition?.type).toBe('analog-clock')
    expect(analogDefinition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    expect(analogConfig).toEqual({})
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
    const definition = dateTimeAddon.buttons.find((button) => button.type === 'date-time')
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: {
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        variant: 'date-time',
      },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        keyIndex: 2,
        label: expect.any(String),
      },
      type: 'deck-button',
    })
  })

  it('creates a renderable analog clock button instance with the expected cadence contract', () => {
    const definition = dateTimeAddon.buttons.find((button) => button.type === 'analog-clock')
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: {},
    } as never)
    const element = instance?.render()

    expect(definition?.defaultIntervalMs).toBe(ANALOG_CLOCK_INTERVAL_MS)
    expect(element).toMatchObject({
      props: {
        keyIndex: 4,
        variant: 'analog-clock',
      },
      type: 'deck-button',
    })
    expect(element?.props.label).toBeUndefined()
    expect(element?.props.subtitle).toBeUndefined()
  })

  it('keeps the shipped Phase 8 review contract on the bundled analog clock type', () => {
    const definition = dateTimeAddon.buttons.find((button) => button.type === 'analog-clock')

    expect(definition?.type).toBe('analog-clock')
    expect(definition?.defaultIntervalMs).toBe(1000)
    expect(definition?.configSchema.parse({})).toEqual({})
  })
})
