import { calendarConfigSchema, type CalendarConfig } from "./domain/config.js"
import {
  refreshProviders,
  type CalendarProvider,
  type ProviderSnapshot,
} from "./domain/provider-cache.js"
import { refreshGoogleToken } from "./auth/google-auth.js"
import { localDay } from "./presentation.js"
import { createGoogleCalendarProvider } from "./providers/google/index.js"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { createAlarmScheduler } from "./domain/alarm-scheduler.js"
import { createAlarmStorage } from "./domain/alarm-storage.js"
import { createProviderStorage } from "./domain/provider-storage.js"
import { occurrenceKey, type CalendarEvent } from "./domain/events.js"
import { safeEventUrl } from "./decks.js"

type GoogleConfig = Extract<
  CalendarConfig["providers"][number],
  { type: "google" }
>
type Credentials = Parameters<typeof refreshGoogleToken>[0]["credentials"]

export const createCalendarRuntime = (options: {
  config: unknown
  credentials?: Credentials
  now?: () => number
  dataDirectory?: string
  onChange?: () => void
  onAlert?: () => void
  onError?: (error: unknown) => void
  provider?: (
    config: GoogleConfig,
    timeMin: string,
    timeMax: string,
  ) => CalendarProvider
}) => {
  const config = calendarConfigSchema.parse(options.config ?? {})
  const now = options.now ?? Date.now
  let snapshots: ProviderSnapshot[] = []
  let scheduler: Awaited<ReturnType<typeof createAlarmScheduler>> | undefined
  let error: string | undefined
  let page = 0
  let selected: string | undefined
  let providerStorage: ReturnType<typeof createProviderStorage> | undefined
  const selections = new Map(
    config.providers.flatMap((provider) =>
      provider.type === "google"
        ? [
            [
              provider.id,
              createHash("sha256")
                .update(
                  JSON.stringify([
                    provider.clientId,
                    [...provider.calendarIds].sort(),
                  ]),
                )
                .digest("hex"),
            ] as const,
          ]
        : [],
    ),
  )
  const start = async () => {
    if (!options.dataDirectory)
      throw new Error("Calendar data directory unavailable")
    providerStorage = createProviderStorage(
      join(options.dataDirectory, "provider-snapshots-v1.json"),
    )
    const stored = await providerStorage.load()
    snapshots = stored
      .filter((item) => selections.get(item.instanceId) === item.selection)
      .map((item) => ({
        instanceId: item.instanceId,
        events: item.events,
        status: "stale" as const,
      }))
    scheduler = await createAlarmScheduler({
      storage: createAlarmStorage(
        join(options.dataDirectory, "alarms-v1.json"),
      ),
      globalSettings: config.alarms,
      useCalendarReminders: config.useCalendarReminders,
      keepStoredAlarm: (alarm) => {
        if (config.useCalendarReminders) return true
        try {
          const id: unknown = JSON.parse(alarm.id)
          const identity: unknown = JSON.parse(alarm.occurrence)
          if (
            !Array.isArray(id) ||
            id[0] !== alarm.occurrence ||
            !Array.isArray(identity) ||
            typeof identity[1] !== "string" ||
            typeof id[1] !== "number"
          )
            return false
          const provider = config.providers.find(
            (item) => item.id === identity[0],
          )
          if (!provider) return false
          const settings =
            provider.type !== "ical"
              ? (provider.calendarAlarms?.[identity[1]] ??
                provider.alarms ??
                config.alarms)
              : (provider.alarms ?? config.alarms)
          return settings.enabled && settings.offsetsMinutes.includes(id[1])
        } catch {
          return false
        }
      },
      snoozeMinutes: config.snoozeMinutes,
      repeatMinutes: config.repeatMinutes,
      missedGraceMinutes: config.missedGraceMinutes,
      now,
      onAlert: () => options.onAlert?.(),
      onChange: () => options.onChange?.(),
      onError: (cause) => {
        error = "Alarm state unavailable"
        options.onError?.(cause)
        options.onChange?.()
      },
    })
    try {
      for (const item of stored) {
        if (selections.get(item.instanceId) !== item.selection)
          await scheduler.refresh(item.instanceId, [])
      }
      if (snapshots.length !== stored.length)
        await providerStorage.save(snapshots, selections)
    } catch (cause) {
      await scheduler.dispose()
      throw cause
    }
    options.onChange?.()
  }
  const startTime = (event: CalendarEvent) => {
    if (event.time.kind === "timed") return Date.parse(event.time.start)
    const target = Date.parse(
      `${event.time.startDate}T${config.allDayTime}:00Z`,
    )
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: event.time.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    let result = target
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(
        formatter.formatToParts(result).map((part) => [part.type, part.value]),
      )
      const represented = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      )
      result += target - represented
    }
    return result
  }
  const refresh = async () => {
    const offsets = [
      config.alarms,
      ...config.providers.flatMap((p) => [
        p.alarms,
        ...(p.type === "ical" ? [] : Object.values(p.calendarAlarms ?? {})),
      ]),
    ].flatMap((settings) => (settings?.enabled ? settings.offsetsMinutes : []))
    const startOfToday = new Date(now())
    startOfToday.setHours(0, 0, 0, 0)
    const timeMin = new Date(
      Math.min(
        startOfToday.getTime(),
        now() - (config.missedGraceMinutes + Math.max(0, ...offsets)) * 60_000,
      ),
    ).toISOString()
    const timeMax = new Date(
      now() +
        Math.max(
          Math.max(config.lookaheadDays, 28) * 86_400_000,
          -Math.min(0, ...offsets) * 60_000,
        ),
    ).toISOString()
    const providers = config.providers.map((instance): CalendarProvider => {
      if (instance.type !== "google")
        return {
          instanceId: instance.id,
          fetchEvents: async () => {
            throw new Error("Provider unsupported")
          },
        }
      if (options.provider) return options.provider(instance, timeMin, timeMax)
      return {
        instanceId: instance.id,
        async fetchEvents() {
          if (!options.credentials)
            throw new Error("Credential store unavailable")
          const accessToken = await refreshGoogleToken({
            instanceId: instance.id,
            clientId: instance.clientId,
            credentials: options.credentials,
          })
          return createGoogleCalendarProvider({
            instanceId: instance.id,
            calendarIds: instance.calendarIds,
            timeMin,
            timeMax,
            accessToken,
          }).fetchEvents()
        },
      }
    })
    snapshots = await refreshProviders(snapshots, providers)
    if (providerStorage && snapshots.some((item) => item.status === "ok")) {
      try {
        await providerStorage.save(snapshots, selections)
      } catch (cause) {
        error = "Calendar provider state unavailable"
        options.onError?.(cause)
        options.onChange?.()
      }
    }
    if (scheduler)
      for (const item of snapshots) {
        if (item.status !== "ok") continue
        const instance = config.providers.find(
          (provider) => provider.id === item.instanceId,
        )
        await scheduler.refresh(
          item.instanceId,
          item.events.map((event) => ({
            event,
            startMs: startTime(event),
            calendarSettings:
              instance && instance.type !== "ical"
                ? (instance.calendarAlarms?.[event.identity.calendarId] ??
                  instance.alarms)
                : instance?.alarms,
          })),
        )
      }
  }
  const visibleEvents = () =>
    snapshots
      .flatMap((s) => s.events)
      .filter((event) => {
        const current = now()
        const notEnded =
          event.time.kind === "timed"
            ? Date.parse(event.time.end) > current
            : event.time.endDateExclusive >
              new Intl.DateTimeFormat("en-CA", {
                timeZone: event.time.timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(current))
        return (
          notEnded &&
          startTime(event) <= current + config.lookaheadDays * 86_400_000
        )
      })
      .sort((a, b) => startTime(a) - startTime(b))
  const snapshot = () => {
    const active = scheduler?.active()
    const alarmEvent =
      active &&
      snapshots
        .flatMap((s) => s.events)
        .find((event) => occurrenceKey(event.identity) === active.occurrence)
    const visible = visibleEvents()
    const display = (event: CalendarEvent) => ({
      title:
        event.title.trim() || event.calendarName || event.identity.calendarId,
      time: event.time,
      day:
        event.time.kind === "all-day"
          ? event.time.startDate
          : new Intl.DateTimeFormat("en-CA", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(event.time.start)),
      calendar: event.calendarName ?? event.identity.calendarId,
      color: (() => {
        const provider = config.providers.find(
          (item) => item.id === event.identity.providerInstanceId,
        )
        return (
          event.eventColor ??
          event.calendarColor ??
          (provider?.type !== "ical"
            ? provider?.calendarColors?.[event.identity.calendarId]
            : undefined)
        )
      })(),
      location: event.location,
      hasLink: !!safeEventUrl(event.externalUrl),
    })
    const events = visible.map(display)
    const detail = visible.find(
      (event) => occurrenceKey(event.identity) === selected,
    )
    return {
      events,
      detail: detail ? display(detail) : undefined,
      alarm: active
        ? {
            title: alarmEvent?.title ?? "Calendar reminder",
            startMs: active.eventStartMs,
          }
        : undefined,
      error,
      page: page % (events.length + 1),
      providers: snapshots.map((s) => ({
        name:
          config.providers.find((p) => p.id === s.instanceId)?.name ??
          s.instanceId,
        status: s.status,
      })),
    }
  }
  return {
    start,
    refresh,
    snapshot,
    selectEvent: (slot: number) => {
      const event = visibleEvents()[slot]
      selected = event ? occurrenceKey(event.identity) : undefined
      options.onChange?.()
      return !!event
    },
    selectedUrl: () =>
      safeEventUrl(
        visibleEvents().find(
          (event) => occurrenceKey(event.identity) === selected,
        )?.externalUrl,
      ),
    nextUrl: () =>
      safeEventUrl(
        visibleEvents().find((event) =>
          event.time.kind === "all-day"
            ? event.time.startDate >= localDay(new Date(now()))
            : startTime(event) >= now(),
        )?.externalUrl,
      ),
    snooze: () => scheduler?.snooze(),
    dismiss: () => scheduler?.dismiss(),
    dismissAll: () => scheduler?.dismissAll(),
    dispose: async () => {
      await scheduler?.dispose()
      await providerStorage?.drain()
    },
    nextPage: () => {
      page++
    },
  }
}

export type CalendarSnapshot = ReturnType<
  ReturnType<typeof createCalendarRuntime>["snapshot"]
>
