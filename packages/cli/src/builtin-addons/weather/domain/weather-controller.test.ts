import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { _resetForTests } from './geocoder'
import {
  createLocatingWeatherSnapshot,
  createUnavailableWeatherSnapshot,
  fetchWeatherSnapshot,
  resolveLocation,
} from './weather-controller'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const WTTR_URL = 'https://wttr.in/'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function vigoResults() {
  return {
    results: [
      {
        id: 1,
        name: 'Vigo',
        latitude: 42.2406,
        longitude: -8.7207,
        country: 'Spain',
        country_code: 'ES',
        admin1: 'Galicia',
        timezone: 'Europe/Madrid',
      },
    ],
  }
}

function openMeteoForecast(name: string) {
  return {
    current: {
      temperature_2m: 18.4,
      weather_code: 3,
      wind_speed_10m: 12.1,
      relative_humidity_2m: 70,
    },
    hourly: {
      time: [],
      temperature_2m: [],
      weather_code: [],
      precipitation_probability: [],
    },
  }
}

describe('resolveLocation', () => {
  beforeEach(() => {
    _resetForTests()
  })
  afterEach(() => {
    _resetForTests()
    vi.restoreAllMocks()
  })

  it('returns a "name" kind for a string location that geocodes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(vigoResults()))
    vi.stubGlobal('fetch', fetchMock)

    const loc = await resolveLocation({ location: 'Vigo, Spain' })

    expect(loc).toEqual({
      kind: 'name',
      latitude: 42.2406,
      longitude: -8.7207,
      name: 'Vigo',
      country: 'Spain',
      timezone: 'Europe/Madrid',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]![0])).toContain(GEOCODING_URL)
  })

  it('returns a "coords" kind for an object location', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const loc = await resolveLocation({
      location: { latitude: 42, longitude: -8, name: 'Vigo' },
    })

    expect(loc).toEqual({
      kind: 'coords',
      latitude: 42,
      longitude: -8,
      name: 'Vigo',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when no location and no IP fallback is requested', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const loc = await resolveLocation({})

    expect(loc).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the geocoder has no match', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const loc = await resolveLocation({ location: 'ThisPlaceDoesNotExist' })

    expect(loc).toBeNull()
  })
})

describe('fetchWeatherSnapshot', () => {
  beforeEach(() => {
    _resetForTests()
  })
  afterEach(() => {
    _resetForTests()
    vi.restoreAllMocks()
  })

  it('returns available snapshot from open-meteo when geocoding succeeds', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = String(input)
      if (url.startsWith(GEOCODING_URL)) {
        return Promise.resolve(jsonResponse(vigoResults()))
      }
      if (url.startsWith(FORECAST_URL)) {
        return Promise.resolve(jsonResponse(openMeteoForecast('Vigo')))
      }
      return Promise.reject(new Error('unexpected URL: ' + url))
    })
    vi.stubGlobal('fetch', fetchMock)

    const snap = await fetchWeatherSnapshot({ location: 'Vigo, Spain' })

    expect(snap.status).toBe('available')
    expect(snap.source).toBe('open-meteo')
    expect(snap.location).toBe('Vigo')
    expect(snap.temperature).toBe(18.4)
    expect(snap.humidity).toBe(70)
    expect(snap.weatherCode).toBe(3)
    expect(snap.windSpeed).toBe(12.1)
  })

  it('returns unavailable with all-providers-failed when both providers throw', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = String(input)
      if (url.startsWith(GEOCODING_URL)) {
        return Promise.resolve(jsonResponse(vigoResults()))
      }
      return Promise.resolve(
        new Response('boom', { status: 500, statusText: 'server error' }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const snap = await fetchWeatherSnapshot({ location: 'Vigo, Spain' })

    expect(snap.status).toBe('unavailable')
    expect(snap.source).toBe('all-providers-failed')
  })

  it('returns location-not-found (not all-providers-failed) when the geocoder returns no results', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = String(input)
      if (url.startsWith(GEOCODING_URL)) {
        return Promise.resolve(jsonResponse({ results: [] }))
      }
      return Promise.reject(new Error('forecast URL should not be called'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const snap = await fetchWeatherSnapshot({ location: 'ThisPlaceDoesNotExist' })

    expect(snap.status).toBe('unavailable')
    expect(snap.source).toBe('location-not-found')
  })
})

describe('createLocatingWeatherSnapshot', () => {
  it('returns a locating snapshot', () => {
    const snap = createLocatingWeatherSnapshot()
    expect(snap.status).toBe('locating')
    expect(snap.source).toBe('locating')
    expect(snap.location).toBe('')
    expect(snap.hourly).toEqual([])
    expect(snap.temperature).toBe(0)
  })
})

describe('createUnavailableWeatherSnapshot', () => {
  it('returns an unavailable snapshot with the given source', () => {
    const snap = createUnavailableWeatherSnapshot('no-location')
    expect(snap.status).toBe('unavailable')
    expect(snap.source).toBe('no-location')
  })
})
