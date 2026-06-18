import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { _resetForTests, searchCity } from '../../domain/geocoder'

function makeResult(overrides: Partial<{
	id: number
	name: string
	latitude: number
	longitude: number
	country: string
	country_code: string
	admin1: string
	timezone: string
}> = {}): Record<string, unknown> {
	return {
		id: 1,
		name: 'Vigo',
		latitude: 42.2406,
		longitude: -8.7207,
		country: 'Spain',
		country_code: 'ES',
		admin1: 'Galicia',
		timezone: 'Europe/Madrid',
		...overrides,
	}
}

function stubFetchOnce(results: unknown, ok = true): ReturnType<typeof vi.fn> {
	const fn = vi.fn().mockResolvedValueOnce({
		ok,
		json: async () => (ok ? { results } : {}),
	})
	vi.stubGlobal('fetch', fn)
	return fn
}

describe('searchCity', () => {
	beforeEach(() => {
		_resetForTests()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		_resetForTests()
	})

	it('returns null synchronously for an empty query without fetching', async () => {
		const fn = vi.fn()
		vi.stubGlobal('fetch', fn)
		const result = await searchCity('   ')
		expect(result).toBeNull()
		expect(fn).not.toHaveBeenCalled()
	})

	it('fetches and returns the first result on cache miss', async () => {
		const fn = stubFetchOnce([makeResult()])
		const result = await searchCity('Vigo')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(result).toEqual({
			latitude: 42.2406,
			longitude: -8.7207,
			name: 'Vigo',
			country: 'Spain',
			timezone: 'Europe/Madrid',
		})
	})

	it('returns the cached result on second call without fetching', async () => {
		const fn = stubFetchOnce([makeResult()])
		const first = await searchCity('Vigo')
		const second = await searchCity('vigo')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(second).toEqual(first)
	})

	it('shares a single fetch between concurrent calls for the same key', async () => {
		let resolveFetch: ((value: Response) => void) | null = null
		const deferred = new Promise<Response>((resolve) => {
			resolveFetch = resolve
		})
		const fn = vi.fn().mockReturnValue(deferred)
		vi.stubGlobal('fetch', fn)

		const p1 = searchCity('Vigo')
		const p2 = searchCity('vigo')
		expect(fn).toHaveBeenCalledTimes(1)

		resolveFetch!({
			ok: true,
			json: async () => ({ results: [makeResult()] }),
		} as Response)

		const [r1, r2] = await Promise.all([p1, p2])
		expect(r1).toEqual(r2)
		expect(r1).not.toBeNull()
	})

	it('returns null and does not cache when the network response is not ok', async () => {
		stubFetchOnce(undefined, false)
		const result = await searchCity('Vigo')
		expect(result).toBeNull()

		// second call still fetches (no cache write on network error)
		stubFetchOnce([makeResult()])
		const second = await searchCity('Vigo')
		expect(second).not.toBeNull()
	})

	it('caches null when results array is empty', async () => {
		const fn = stubFetchOnce([])
		const result = await searchCity('Atlantis')
		expect(result).toBeNull()
		expect(fn).toHaveBeenCalledTimes(1)

		// second call uses cache, no fetch
		const second = await searchCity('atlantis')
		expect(second).toBeNull()
	})

	it('picks the country match for "Vigo, Spain" style queries', async () => {
		const fn = stubFetchOnce([
			makeResult({ id: 1, name: 'Vigo', country: 'Portugal' }),
			makeResult({ id: 2, name: 'Vigo', country: 'Spain' }),
		])
		const result = await searchCity('Vigo, Spain')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(result?.country).toBe('Spain')
	})

	it('picks country_code match for "Vigo, ES" style queries', async () => {
		const fn = stubFetchOnce([
			makeResult({ id: 1, name: 'Vigo', country: 'Portugal', country_code: 'PT' }),
			makeResult({ id: 2, name: 'Vigo', country: 'Spain', country_code: 'ES' }),
		])
		const result = await searchCity('Vigo, ES')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(result?.country).toBe('Spain')
	})

	it('picks admin1 match for "Vigo, Galicia" style queries', async () => {
		const fn = stubFetchOnce([
			makeResult({ id: 1, name: 'Vigo', country: 'Argentina', admin1: 'Buenos Aires' }),
			makeResult({ id: 2, name: 'Vigo', country: 'Spain', admin1: 'Galicia' }),
		])
		const result = await searchCity('Vigo, Galicia')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(result?.country).toBe('Spain')
	})

	it('returns null when a country filter rejects every result', async () => {
		const fn = stubFetchOnce([
			makeResult({ id: 1, name: 'Vigo', country: 'Spain', admin1: 'Galicia' }),
		])
		const result = await searchCity('Vigo, Mars')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(result).toBeNull()
	})

	it('evicts the oldest cache entry when the cache grows past 1000', async () => {
		// Insert 1001 distinct keys via stubbed fetch returning unique results.
		let count = 0
		const fn = vi.fn(async (url: string) => {
			const u = new URL(url)
			const name = u.searchParams.get('name') ?? ''
			count++
			return {
				ok: true,
				json: async () => ({
					results: [
						makeResult({ id: count, name, country: 'X', admin1: 'Y' }),
					],
				}),
			} as Response
		})
		vi.stubGlobal('fetch', fn)

		for (let i = 0; i < 1001; i++) {
			await searchCity(`city-${i}`)
		}
		// Cache cap is 1000; the first key (city-0) should be evicted.
		// A re-fetch for 'city-0' triggers a new HTTP call.
		const callsBefore = fn.mock.calls.length
		const result = await searchCity('city-0')
		expect(result).not.toBeNull()
		expect(fn.mock.calls.length).toBe(callsBefore + 1)
	})

	it('returns null when the request is aborted by the timeout', async () => {
		const fn = vi.fn().mockImplementation((_url: string, init?: { signal?: AbortSignal }) => {
			return new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'))
				})
			})
		})
		vi.stubGlobal('fetch', fn)
		const result = await searchCity('Vigo')
		expect(result).toBeNull()
	}, 8000)
})
