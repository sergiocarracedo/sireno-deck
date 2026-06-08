import { defineMountedButton } from '@/addon/api'

import {
  createUnavailableWeatherSnapshot,
  createWeatherController,
  type WeatherSnapshot,
} from '../domain/weather-controller'
import { WeatherButtonSchema, type SurfacePage } from '../schemas'
import { Surface } from './components/Surface'

type WeatherStoreState = {
  snapshot: WeatherSnapshot
  page: SurfacePage
  pageChangedAt?: number
  autoReturnTimer?: ReturnType<typeof globalThis.setTimeout>
}

function getState(snapshot: unknown): WeatherStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as WeatherStoreState)
    : { snapshot: createUnavailableWeatherSnapshot('init'), page: 'main' }
}

function getNextPage(current: SurfacePage): SurfacePage {
  const pages: SurfacePage[] = ['main', 'data', 'hourly-forecast', 'daily-forecast']
  const currentIndex = pages.indexOf(current)
  const nextIndex = (currentIndex + 1) % pages.length
  return pages[nextIndex]
}

function clearAutoReturnTimer(state: WeatherStoreState): void {
  if (state.autoReturnTimer) {
    globalThis.clearTimeout(state.autoReturnTimer)
  }
}

function checkAndResetPageIfNeeded(
  state: WeatherStoreState,
): WeatherStoreState {
  if (state.page === 'main' || !state.pageChangedAt) {
    return state
  }

  const now = globalThis.Date.now()
  if (now - state.pageChangedAt >= 30_000) {
    clearAutoReturnTimer(state)
    return {
      ...state,
      page: 'main',
      pageChangedAt: undefined,
      autoReturnTimer: undefined,
    }
  }

  return state
}

export const builtinWeatherButton = defineMountedButton({
  configSchema: WeatherButtonSchema,
  defaultIntervalMs: ({ config }) => config.render_interval_ms!,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_min! * 60_000,
  dispose: ({ store }) => {
    const state = getState(store.button.snapshot)
    clearAutoReturnTimer(state)
  },
  onActivate: async ({ config, hostContext, store }) => {
    const state = getState(store.button.snapshot)
    clearAutoReturnTimer(state)

    const controller = createWeatherController({
      hostContext,
      config: {
        location: config.location,
        poll_interval_min: config.poll_interval_min ?? 10,
        render_interval_ms: config.render_interval_ms ?? 600_000,
        units: config.units ?? 'metric',
        use_ip_geolocation: config.use_ip_geolocation,
      },
    })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({
        snapshot: snap,
        page: 'main',
        pageChangedAt: undefined,
        autoReturnTimer: undefined,
      } as WeatherStoreState)
    } catch {
      store.button.set({
        snapshot: createUnavailableWeatherSnapshot('init'),
        page: 'main',
        pageChangedAt: undefined,
        autoReturnTimer: undefined,
      } as WeatherStoreState)
    }
  },
  onTap: ({ store }) => {
    store.button.update((snapshot) => {
      const state = getState(snapshot)
      clearAutoReturnTimer(state)

      const nextPage = getNextPage(state.page)
      const now = globalThis.Date.now()

      return {
        ...state,
        page: nextPage,
        pageChangedAt: nextPage === 'main' ? undefined : now,
        autoReturnTimer: undefined,
      }
    })
  },
  poll: async ({ config, hostContext, store }) => {
    const controller = createWeatherController({
      hostContext,
      config: {
        location: config.location,
        poll_interval_min: config.poll_interval_min ?? 10,
        render_interval_ms: config.render_interval_ms ?? 600_000,
        units: config.units ?? 'metric',
        use_ip_geolocation: config.use_ip_geolocation,
      },
    })
    try {
      const snap = await controller.getSnapshot()
      store.button.update((snapshot) => {
        const state = getState(snapshot)
        const checked = checkAndResetPageIfNeeded(state)
        return {
          ...checked,
          snapshot: snap,
        }
      })
    } catch {
      // keep last
    }
  },
  render: ({ config, store }) => {
    let state = getState(store.button.snapshot)
    state = checkAndResetPageIfNeeded(state)

    return (
      <Surface snap={state.snapshot} units={config.units} page={state.page} />
    )
  },
  type: 'weather',
})
