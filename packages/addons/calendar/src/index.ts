import { z } from "zod"
import {
  CalendarButton,
  CalendarSettingButton,
  CalendarEventButton,
  CalendarDetailButton,
  CalendarNavigationButton,
  CalendarAlarmBell,
  CalendarAlarmCountdown,
  CalendarAlarmClock,
  CalendarAlarmTitle,
  CalendarAlarmDismiss,
  CalendarAlarmSnooze,
  CalendarAlarmArrow,
  CalendarAlarmCompactInfo,
} from "./frontend.js"
import { createCalendarDecks } from "./decks.js"
import { createCalendarRuntime, type CalendarSnapshot } from "./runtime.js"
import { calendarConfigSchema } from "./domain/config.js"

type Context = {
  credentials?: Parameters<typeof createCalendarRuntime>[0]["credentials"]
  publish(data: unknown): void
  poll?: (id: string) => Promise<void>
  getDataDirectory?: () => Promise<string>
  interruptDeck?: (
    deckId: string,
    options?: { onBack?: () => void | Promise<void> },
  ) => (() => void) | null
  showModal?: (
    deckId: string,
    options?: { onOk?: () => void | Promise<void> },
  ) => (() => void) | null
  notify?: (args: { title: string; body: string }) => Promise<void>
  requestDeckRebuild?: () => void
}

let runtime: ReturnType<typeof createCalendarRuntime> | undefined
let context: Context | undefined
const empty: CalendarSnapshot = {
  events: [],
  detail: undefined,
  page: 0,
  providers: [],
  calendars: [],
  alarm: undefined,
  error: undefined,
}
let release: (() => void) | null = null
let interrupted = false
let initialDeckRebuild = false
let lastDeckEvents: string | undefined
let loading = true
let started = false
let pollPending = false
let startupFailed = false

const rebuildWhenEventsChange = (state: CalendarSnapshot) => {
  const events = JSON.stringify([state.events, state.calendars])
  if (
    initialDeckRebuild ||
    (lastDeckEvents !== undefined && events !== lastDeckEvents)
  ) {
    initialDeckRebuild = false
    context?.requestDeckRebuild?.()
  }
  lastDeckEvents = events
}

export const globalService = {
  pollers: [
    {
      id: "state",
      channel: "calendar:state",
      intervalMs: 300_000,
      async poll() {
        if (!started) {
          if (startupFailed)
            return {
              ...empty,
              loading: false,
              error: "Calendar state unavailable",
            }
          pollPending = true
          return { ...(runtime?.snapshot() ?? empty), loading: true }
        }
        try {
          await runtime?.refresh()
        } catch {
          loading = false
          return {
            ...(runtime?.snapshot() ?? empty),
            loading,
            error: "Calendar state unavailable",
          }
        }
        loading = false
        const state = runtime?.snapshot() ?? empty
        rebuildWhenEventsChange(state)
        return { ...state, loading }
      },
    },
  ],
  methods: {
    async toggleCalendar(instanceId: unknown, calendarId: unknown) {
      if (typeof instanceId !== "string" || typeof calendarId !== "string")
        return
      const calendar = runtime
        ?.snapshot()
        .calendars.find(
          (item) => item.instanceId === instanceId && item.id === calendarId,
        )
      if (calendar)
        await runtime?.setCalendarEnabled(
          instanceId,
          calendarId,
          !calendar.enabled,
        )
    },
    async nextPage() {
      if (runtime?.snapshot().alarm) await runtime.snooze()
      else runtime?.nextPage()
      context?.publish({ ...(runtime?.snapshot() ?? empty), loading })
    },
    async dismiss() {
      await runtime?.dismiss()
    },
    async snooze() {
      await runtime?.snooze()
    },
    async dismissAll() {
      await runtime?.dismissAll()
    },
    hasAlarm() {
      return !!runtime?.snapshot().alarm
    },
    selectEvent(slot: unknown) {
      return typeof slot === "number" && runtime?.selectEvent(slot)
    },
    selectedUrl() {
      return runtime?.selectedUrl()
    },
    nextUrl() {
      return runtime?.nextUrl()
    },
  },
  async onLoad(ctx: Context, config?: unknown) {
    context = ctx
    loading = true
    const settings = calendarConfigSchema.parse(config ?? {})
    const dataDirectory = await ctx.getDataDirectory?.()
    const update = () => {
      const state = runtime?.snapshot() ?? empty
      rebuildWhenEventsChange(state)
      if (state.alarm && settings.interrupt && !interrupted) {
        release =
          ctx.showModal?.("calendar:alarm", {
            onOk: async () => {
              await runtime?.snooze()
            },
          }) ?? null
        interrupted = release !== null
      } else if (!state.alarm && interrupted) {
        release?.()
        release = null
        interrupted = false
      }
      ctx.publish({ ...state, loading })
    }
    runtime = createCalendarRuntime({
      config,
      credentials: ctx.credentials,
      dataDirectory,
      onChange: update,
      onAlert: () => {
        if (settings.systemNotifications)
          void ctx
            .notify?.({
              title: "Calendar reminder",
              body: "An event needs your attention.",
            })
            .catch(() => {})
      },
      onError: () =>
        ctx.publish({
          ...empty,
          loading: false,
          error: "Calendar state unavailable",
        }),
    })
    try {
      await runtime.start()
      initialDeckRebuild = true
      started = true
      if (pollPending) {
        pollPending = false
        await ctx.poll?.("state")
      }
    } catch (error) {
      loading = false
      startupFailed = true
      ctx.publish({ ...empty, loading, error: "Calendar state unavailable" })
      throw error
    }
  },
  async onUnload() {
    await runtime?.dispose()
    release?.()
    release = null
    interrupted = false
    initialDeckRebuild = false
    lastDeckEvents = undefined
    loading = true
    started = false
    pollPending = false
    startupFailed = false
    runtime = undefined
    context = undefined
  },
}
export const manifest = {
  apiVersion: 1 as const,
  name: "calendar",
  settings: {
    label: "Calendar",
    icon: "icon://calendar-days",
    deck: "calendar:settings",
  },
  defaultButton: "calendar:upcoming",
  buttonTypes: {
    "calendar:setting": {
      frontend: CalendarSettingButton,
      service: {
        internal: true,
        configSchema: z
          .object({ instanceId: z.string(), calendarId: z.string() })
          .strict(),
        gestureHandlers: ["tap"] as const,
        onTap(ctx: {
          config: { instanceId: string; calendarId: string }
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:toggleCalendar"]?.(
            ctx.config.instanceId,
            ctx.config.calendarId,
          )
        },
      },
    },
    "calendar:upcoming": {
      frontend: CalendarButton,
      service: {
        configSchema: z.object({}).strict(),
        gestureHandlers: ["tap", "hold"] as const,
        onTap(ctx: {
          coreMethods?: { navigateToDeck(args: { id: string }): void }
        }) {
          ctx.coreMethods?.navigateToDeck({ id: "calendar:deck" })
        },
        async onHold(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
          coreMethods?: { dispatch(value: string): Promise<void> }
        }) {
          const url = ctx.methods["calendar:nextUrl"]?.()
          if (typeof url === "string")
            await ctx.coreMethods?.dispatch(`url://${url}`)
        },
      },
    },
    "calendar:event": {
      frontend: CalendarEventButton,
      service: {
        internal: true,
        configSchema: z
          .object({ slot: z.number().int().nonnegative() })
          .strict(),
        gestureHandlers: ["tap"] as const,
        async onTap(ctx: {
          config: { slot: number }
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
          coreMethods: {
            dispatch(value: string): Promise<void>
          }
        }) {
          if (!ctx.methods["calendar:selectEvent"]?.(ctx.config.slot)) return
          const url = ctx.methods["calendar:selectedUrl"]?.()
          if (typeof url === "string")
            await ctx.coreMethods.dispatch(`url://${url}`)
        },
      },
    },
    "calendar:detail": {
      frontend: CalendarDetailButton,
      service: {
        internal: true,
        configSchema: z.object({}).strict(),
        gestureHandlers: ["hold"] as const,
        async onHold(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
          coreMethods: { dispatch(value: string): Promise<void> }
        }) {
          const url = ctx.methods["calendar:selectedUrl"]?.()
          if (typeof url === "string")
            await ctx.coreMethods.dispatch(`url://${url}`)
        },
      },
    },
    "calendar:navigate": {
      frontend: CalendarNavigationButton,
      service: {
        internal: true,
        configSchema: z
          .object({ target: z.string(), label: z.string() })
          .strict(),
        gestureHandlers: ["tap", "hold"] as const,
        onTap(ctx: {
          config: { target: string }
          coreMethods: { navigateToDeck(args: { id: string }): void }
        }) {
          ctx.coreMethods.navigateToDeck({ id: ctx.config.target })
        },
      },
    },
    "calendar:day": {
      frontend: CalendarNavigationButton,
      service: {
        internal: true,
        configSchema: z
          .object({ target: z.string(), day: z.string() })
          .strict(),
        gestureHandlers: ["tap"] as const,
        onTap(ctx: {
          config: { target: string }
          coreMethods: { navigateToDeck(args: { id: string }): void }
        }) {
          ctx.coreMethods.navigateToDeck({ id: ctx.config.target })
        },
      },
    },
    "calendar:alarm-bell": {
      frontend: CalendarAlarmBell,
      service: { internal: true, full: true },
    },
    "calendar:alarm-countdown": {
      frontend: CalendarAlarmCountdown,
      service: { internal: true, full: true },
    },
    "calendar:alarm-clock": {
      frontend: CalendarAlarmClock,
      service: { internal: true, full: true },
    },
    "calendar:alarm-title": {
      frontend: CalendarAlarmTitle,
      service: { internal: true, full: true },
    },
    "calendar:alarm-arrow": {
      frontend: CalendarAlarmArrow,
      service: { internal: true, full: true },
    },
    "calendar:alarm-compact-info": {
      frontend: CalendarAlarmCompactInfo,
      service: { internal: true, full: true },
    },
    "calendar:alarm-dismiss": {
      frontend: CalendarAlarmDismiss,
      service: {
        internal: true,
        configSchema: z.object({}).strict(),
        gestureHandlers: ["tap", "hold"] as const,
        onTap(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          // Dismiss must clear every reminder of this occurrence: with two
          // offsets active at once, dismissing only the earliest leaves the
          // next one active and the modal re-presents immediately.
          return ctx.methods["calendar:dismissAll"]?.()
        },
        onHold(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:dismissAll"]?.()
        },
      },
    },
    "calendar:alarm-snooze": {
      frontend: CalendarAlarmSnooze,
      service: {
        internal: true,
        configSchema: z.object({}).strict(),
        gestureHandlers: ["tap", "hold"] as const,
        onTap(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:snooze"]?.()
        },
        onHold(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:snooze"]?.()
        },
      },
    },
  },
  decks: [
    {
      createDecks: ({ keyCount }: { keyCount: number }) =>
        createCalendarDecks(
          runtime?.snapshot().events ?? [],
          keyCount,
          runtime?.snapshot().calendars ?? [],
        ),
      internal: true,
    },
  ],
  globalService,
}
