import { defineMountedButton } from '@/addon/api'

import { Surface } from '../components/Surface'
import {
  createUnavailableWeatherSnapshot,
  createWeatherController,
  type WeatherSnapshot,
} from '../domain/weather-controller'
import { WeatherButtonSchema } from '../schemas'

type WeatherStoreState = { snapshot: WeatherSnapshot }

function getState(snapshot: unknown): WeatherStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as WeatherStoreState)
    : { snapshot: createUnavailableWeatherSnapshot('init') }
}

export const builtinWeatherButton = defineMountedButton({
  configSchema: WeatherButtonSchema,
  defaultIntervalMs: ({ config }) => config.render_interval_ms,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  onActivate: async ({ config, hostContext, store }) => {
    const controller = createWeatherController({ hostContext, config })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as WeatherStoreState)
    } catch {
      store.button.set({
        snapshot: createUnavailableWeatherSnapshot('init'),
      } as WeatherStoreState)
    }
  },
  poll: async ({ config, hostContext, store }) => {
    const controller = createWeatherController({ hostContext, config })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as WeatherStoreState)
    } catch {
      // keep last
    }
  },
  render: ({ config, store }) => {
    const state = getState(store.button.snapshot)
    return <Surface snap={state.snapshot} unavailable={config.unavailable_label} />
  },
  type: 'weather',
})
