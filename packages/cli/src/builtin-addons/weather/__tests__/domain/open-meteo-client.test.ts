import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchOpenMeteoSnapshot } from '../../domain/open-meteo-client'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

function baseCurrent(overrides: Record<string, unknown> = {}) {
  return {
    temperature_2m: 18.5,
    weather_code: 3,
    wind_speed_10m: 12,
    relative_humidity_2m: 65,
    ...overrides,
  }
}

function cannedResponse(
  current: Record<string, unknown>,
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
    precipitation_sum: number[]
  },
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ current, daily }),
  } as unknown as Response
}

function setupFetchMock() {
  const fetchMock = vi.fn()
  const original = globalThis.fetch
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return {
    fetchMock,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

describe('fetchOpenMeteoSnapshot daily parsing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('happy path: 3 days returned, sliced to 2 daily entries', async () => {
    const { fetchMock, restore } = setupFetchMock()
    try {
      fetchMock.mockResolvedValueOnce(
        cannedResponse(baseCurrent(), {
          time: ['2026-06-08', '2026-06-09', '2026-06-10'],
          temperature_2m_max: [22, 25, 20],
          temperature_2m_min: [10, 12, 11],
          weather_code: [3, 1, 61],
          precipitation_sum: [0, 0, 5.4],
        }),
      )

      const snap = await fetchOpenMeteoSnapshot(42, -8, 'Vigo')
      expect(snap.daily).toHaveLength(2)
      expect(snap.daily[0]).toEqual({
        date: '2026-06-08',
        weatherCode: 3,
        tempMax: 22,
        tempMin: 10,
        precipitationSum: 0,
      })
      expect(snap.daily[1]).toEqual({
        date: '2026-06-09',
        weatherCode: 1,
        tempMax: 25,
        tempMin: 12,
        precipitationSum: 0,
      })
    } finally {
      restore()
    }
  })

  it('daily absent: snapshot.daily is an empty array', async () => {
    const { fetchMock, restore } = setupFetchMock()
    try {
      fetchMock.mockResolvedValueOnce(cannedResponse(baseCurrent()))

      const snap = await fetchOpenMeteoSnapshot(42, -8, 'Vigo')
      expect(snap.daily).toEqual([])
    } finally {
      restore()
    }
  })

  it('daily forecast URL includes timezone=auto query parameter', async () => {
    const { fetchMock, restore } = setupFetchMock()
    try {
      fetchMock.mockResolvedValueOnce(
        cannedResponse(baseCurrent(), {
          time: ['2026-06-08', '2026-06-09', '2026-06-10'],
          temperature_2m_max: [22, 25, 20],
          temperature_2m_min: [10, 12, 11],
          weather_code: [3, 1, 61],
          precipitation_sum: [0, 0, 5.4],
        }),
      )

      await fetchOpenMeteoSnapshot(42, -8, 'Vigo')
      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('timezone=auto')
    } finally {
      restore()
    }
  })

  it('daily.time empty: snapshot.daily is an empty array', async () => {
    const { fetchMock, restore } = setupFetchMock()
    try {
      fetchMock.mockResolvedValueOnce(
        cannedResponse(baseCurrent(), {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: [],
        }),
      )

      const snap = await fetchOpenMeteoSnapshot(42, -8, 'Vigo')
      expect(snap.daily).toEqual([])
    } finally {
      restore()
    }
  })
})
