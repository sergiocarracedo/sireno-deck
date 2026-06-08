export interface GeocoderResult {
	latitude: number
	longitude: number
	name: string
	country: string
	timezone: string
}

interface OpenMeteoResult {
	id: number
	name: string
	latitude: number
	longitude: number
	country?: string
	country_code?: string
	admin1?: string
	timezone?: string
}

interface OpenMeteoResponse {
	results?: OpenMeteoResult[]
}

const CACHE_LIMIT = 1000
const TIMEOUT_MS = 5000

const cache: Map<string, GeocoderResult | null> = new Map()
const inflight: Map<string, Promise<GeocoderResult | null>> = new Map()
const insertionOrder: string[] = []

function normalizeKey(query: string): string {
	return query.trim().toLowerCase()
}

function roundTo4(n: number): number {
	return Math.round(n * 1e4) / 1e4
}

function matchScore(result: OpenMeteoResult, countryFilter: string): number {
	const filter = countryFilter.trim().toLowerCase()
	if (result.country && result.country.toLowerCase() === filter) return 100
	if (result.country_code && result.country_code.toLowerCase() === filter) return 80
	if (result.admin1 && result.admin1.toLowerCase() === filter) return 60
	return 0
}

function pickResult(
	results: OpenMeteoResult[],
	query: string,
): OpenMeteoResult | null {
	const parts = query.split(',').map((p) => p.trim())
	if (parts.length === 2 && parts[1]!.length >= 2) {
		const countryFilter = parts[1]!
		let best: { result: OpenMeteoResult; score: number } | null = null
		for (const r of results) {
			const score = matchScore(r, countryFilter)
			if (score >= 60 && (!best || score > best.score)) {
				best = { result: r, score }
			}
		}
		if (!best) return null
		return best.result
	}
	return results[0] ?? null
}

function rememberKey(key: string): void {
	insertionOrder.push(key)
	if (cache.size > CACHE_LIMIT) {
		const oldest = insertionOrder.shift()
		if (oldest !== undefined) {
			cache.delete(oldest)
			inflight.delete(oldest)
		}
	}
}

export async function searchCity(
	query: string,
	options?: { signal?: AbortSignal },
): Promise<GeocoderResult | null> {
	const trimmed = query.trim()
	if (trimmed.length === 0) return null

	const key = normalizeKey(query)
	if (cache.has(key)) return cache.get(key) ?? null
	if (inflight.has(key)) return inflight.get(key) ?? null

	const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
	const signal = options?.signal
		? AbortSignal.any([options.signal, timeoutSignal])
		: timeoutSignal

	const promise = (async (): Promise<GeocoderResult | null> => {
		try {
			const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=10&language=en&format=json`
			const response = await fetch(url, { signal })
			if (!response.ok) return null
			const json = (await response.json()) as OpenMeteoResponse
			if (!json.results || json.results.length === 0) {
				cache.set(key, null)
				rememberKey(key)
				return null
			}
			const picked = pickResult(json.results, trimmed)
			if (!picked) {
				cache.set(key, null)
				rememberKey(key)
				return null
			}
			const result: GeocoderResult = {
				latitude: roundTo4(picked.latitude),
				longitude: roundTo4(picked.longitude),
				name: picked.name,
				country: picked.country ?? '',
				timezone: picked.timezone ?? '',
			}
			cache.set(key, result)
			rememberKey(key)
			return result
		} catch {
			return null
		} finally {
			inflight.delete(key)
		}
	})()

	inflight.set(key, promise)
	return promise
}

export function _resetForTests(): void {
	cache.clear()
	inflight.clear()
	insertionOrder.length = 0
}
