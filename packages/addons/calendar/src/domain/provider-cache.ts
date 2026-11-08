import type { CalendarEvent } from "./events.js"

export interface CalendarProvider {
  readonly instanceId: string
  fetchEvents(): Promise<readonly CalendarEvent[]>
}

export interface ProviderSnapshot {
  readonly instanceId: string
  readonly events: readonly CalendarEvent[]
  readonly status: "ok" | "stale" | "unavailable"
}

/** Keep the last successful snapshot for each failed instance without exposing errors. */
export const refreshProviders = async (
  previous: readonly ProviderSnapshot[],
  providers: readonly CalendarProvider[],
): Promise<ProviderSnapshot[]> => {
  const snapshots = new Map(previous.map((item) => [item.instanceId, item]))
  return Promise.all(
    providers.map(async (provider): Promise<ProviderSnapshot> => {
      try {
        return {
          instanceId: provider.instanceId,
          events: await provider.fetchEvents(),
          status: "ok",
        }
      } catch {
        const old = snapshots.get(provider.instanceId)
        return {
          instanceId: provider.instanceId,
          events: old?.events ?? [],
          status: old && old.status !== "unavailable" ? "stale" : "unavailable",
        }
      }
    }),
  )
}
