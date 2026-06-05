import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '../../../render/dom-host.js'
import { builtinWeatherButton } from './weather.js'
import type { WeatherSnapshot } from '../domain/weather-controller.js'

function createHarness(button: typeof builtinWeatherButton, config: unknown, snapshot: unknown) {
  const buttonStore: {
    snapshot: unknown
    set: (v: unknown) => void
  } = {
    snapshot,
    set(v) {
      buttonStore.snapshot = v
    },
  }
  const props = {
    button: { position: 0, type: button.type },
    config,
    frameState: 'idle' as const,
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    methods: { invalidate: () => {} } as never,
    pressed: false,
    store: {
      addon: { snapshot: undefined } as never,
      button: buttonStore as never,
    },
    theme: {} as never,
  } as never
  return {
    render: () => button.render(props),
  }
}

const availableSnapshot: WeatherSnapshot = {
  available: true,
  humidity: 65,
  location: 'London',
  source: 'open-meteo',
  temperature: 24,
  weatherCode: 3,
  windSpeed: 12,
}

describe('weather', () => {
  it("renders the unavailable_label when no snapshot is available", () => {
    const button = builtinWeatherButton
    const harness = createHarness(button, { units: 'metric' }, undefined)
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('Weather')
  })

  it('renders the temperature number when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('24°')
  })

  it('renders the location text when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('London')
  })

  it('renders the humidity percentage when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('65%')
  })

  it('renders the correct WMO icon for clear-sky code (0)', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: { ...availableSnapshot, weatherCode: 0 } },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('sun')
  })

  it('renders the correct WMO icon for rain code (65)', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: { ...availableSnapshot, weatherCode: 65 } },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('cloud-rain')
  })
})
