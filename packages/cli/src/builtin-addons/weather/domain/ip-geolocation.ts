export async function fetchIpGeolocation(): Promise<{
  latitude: number
  longitude: number
  name: string
} | null> {
  try {
    const response = await fetch('https://ipapi.co/json/')
    if (!response.ok) return null
    const json = (await response.json()) as {
      latitude?: number
      longitude?: number
      city?: string
      country_name?: string
    }
    if (typeof json.latitude !== 'number' || typeof json.longitude !== 'number') {
      return null
    }
    return {
      latitude: json.latitude,
      longitude: json.longitude,
      name: json.city ?? json.country_name ?? 'IP location',
    }
  } catch {
    return null
  }
}
