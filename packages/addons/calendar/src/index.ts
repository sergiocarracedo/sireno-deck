import { z } from "zod"
import {
  CalendarButton,
  CalendarEventButton,
  CalendarDetailButton,
  CalendarNavigationButton,
} from "./frontend.js"
import { createCalendarDecks } from "./decks.js"
import { createCalendarRuntime, type CalendarSnapshot } from "./runtime.js"
import { calendarConfigSchema } from "./domain/config.js"

type Context = {
  credentials?: Parameters<typeof createCalendarRuntime>[0]["credentials"]
  publish(data: unknown): void
  getDataDirectory?: () => Promise<string>
  interruptDeck?: (deckId: string) => (() => void) | null
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
  alarm: undefined,
  error: undefined,
}
let release: (() => void) | null = null
let interrupted = false

export const globalService = {
  pollers: [
    {
      id: "state",
      channel: "calendar:state",
      intervalMs: 300_000,
      async poll() {
        const before = JSON.stringify(runtime?.snapshot().events ?? [])
        await runtime?.refresh()
        const state = runtime?.snapshot() ?? empty
        if (JSON.stringify(state.events) !== before)
          context?.requestDeckRebuild?.()
        return state
      },
    },
  ],
  methods: {
    async nextPage() {
      if (runtime?.snapshot().alarm) await runtime.snooze()
      else runtime?.nextPage()
      context?.publish(runtime?.snapshot() ?? empty)
    },
    async dismiss() {
      await runtime?.dismiss()
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
  },
  async onLoad(ctx: Context, config?: unknown) {
    context = ctx
    const settings = calendarConfigSchema.parse(config ?? {})
    const dataDirectory = await ctx.getDataDirectory?.()
    const update = () => {
      const state = runtime?.snapshot() ?? empty
      if (state.alarm && settings.interrupt && !interrupted) {
        release = ctx.interruptDeck?.("calendar:alarm") ?? null
        interrupted = true
      } else if (!state.alarm && interrupted) {
        release?.()
        release = null
        interrupted = false
      }
      ctx.publish(state)
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
        ctx.publish({ ...empty, error: "Calendar state unavailable" }),
    })
    try {
      await runtime.start()
    } catch (error) {
      ctx.publish({ ...empty, error: "Calendar state unavailable" })
      throw error
    }
  },
  async onUnload() {
    await runtime?.dispose()
    release?.()
    release = null
    interrupted = false
    runtime = undefined
    context = undefined
  },
}
export const manifest = {
  apiVersion: 1 as const,
  name: "calendar",
  defaultButton: "calendar:upcoming",
  buttonTypes: {
    "calendar:upcoming": {
      frontend: CalendarButton,
      service: {
        configSchema: z.object({}).strict(),
        gestureHandlers: ["tap", "hold", "dbl-tap"] as const,
        onTap(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:nextPage"]?.()
        },
        onHold(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
          coreMethods?: { navigateToDeck(args: { id: string }): void }
        }) {
          if (ctx.methods["calendar:hasAlarm"]?.())
            return ctx.methods["calendar:dismiss"]?.()
          ctx.coreMethods?.navigateToDeck({ id: "calendar:events" })
        },
        onDblTap(ctx: {
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
        }) {
          return ctx.methods["calendar:dismissAll"]?.()
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
        onTap(ctx: {
          config: { slot: number }
          methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
          coreMethods: { navigateToDeck(args: { id: string }): void }
        }) {
          if (ctx.methods["calendar:selectEvent"]?.(ctx.config.slot))
            ctx.coreMethods.navigateToDeck({ id: "calendar:detail" })
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
        gestureHandlers: ["tap"] as const,
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
  },
  decks: [
    {
      id: "calendar:alarm",
      name: "Calendar alarm",
      internal: true,
      buttons: [{ type: "calendar:upcoming", config: {} }],
    },
    {
      createDecks: ({ keyCount }: { keyCount: number }) =>
        createCalendarDecks(runtime?.snapshot().events ?? [], keyCount),
      internal: true,
    },
  ],
  globalService,
}
