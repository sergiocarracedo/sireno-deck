import type { CoreMethods } from "../../types.js"
import {
  configSchema,
  DEFAULT_DURATION_SEC,
  type ConfigSchema,
  type PersistedState,
} from "./config.js"

interface ButtonServiceContextLike<Config> {
  readonly config: Config
  readonly buttonId: string
  readonly addonName: string
  readonly methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
  readonly coreMethods: CoreMethods
  readonly publish: (channel: string, data: unknown) => void
  readonly executor: { run: (...args: unknown[]) => Promise<unknown> }
  readonly signal: AbortSignal
  readonly store: {
    buttonScope<T>(
      addonName: string,
      buttonId: string,
    ): {
      get(key: string): T | undefined
      set(key: string, value: T): void
      update(key: string, fn: (current: T | undefined) => T): T
      clear(): void
      snapshot(): Readonly<Record<string, T>>
    }
  }
}

const ADDON_NAME = "pomodoro"

const getPersisted = (
  ctx: ButtonServiceContextLike<ConfigSchema>,
): PersistedState => {
  const scope = ctx.store.buttonScope<PersistedState>(ADDON_NAME, ctx.buttonId)
  const value = scope.get("state")
  const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
  if (value === undefined) {
    return {
      status: "idle",
      startTsMs: null,
      durationSec,
      remainingSec: null,
    }
  }
  return { ...value, remainingSec: value.remainingSec ?? null }
}

const writePersisted = (
  ctx: ButtonServiceContextLike<ConfigSchema>,
  next: PersistedState,
): void => {
  const scope = ctx.store.buttonScope<PersistedState>(ADDON_NAME, ctx.buttonId)
  scope.set("state", next)
}

export default {
  configSchema,
  defaultRenderIntervalMs: 1000,
  onMount: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
    const notification = ctx.config?.notification
    // register() seeds the global runtime as PAUSED at full duration, so
    // the tile shows the configured time awaiting a tap. The branches
    // below only override that for states worth resuming.
    ctx.methods["pomodoro:register"]?.(ctx.buttonId, durationSec, notification)

    if (
      persisted.status === "running" &&
      typeof persisted.startTsMs === "number"
    ) {
      const elapsedSec = (Date.now() - persisted.startTsMs) / 1000
      if (elapsedSec < durationSec) {
        // still counting down from a previous session — resume it
        ctx.methods["pomodoro:startWith"]?.(
          ctx.buttonId,
          persisted.startTsMs,
          durationSec,
          notification,
        )
        return
      }
      // ponytail: expired while we were away — silent reset. The user
      // chose no boot-time "Time's up!" notification; the global runtime
      // is already paused-at-full from register(), just clear persisted.
      writePersisted(ctx, {
        status: "idle",
        startTsMs: null,
        durationSec,
        remainingSec: null,
      })
      return
    }
    if (persisted.status === "paused" && persisted.remainingSec !== null) {
      // resume as paused with the remaining time (not the full duration)
      const startTsMs =
        Date.now() - (durationSec - persisted.remainingSec) * 1000
      ctx.methods["pomodoro:startWith"]?.(
        ctx.buttonId,
        startTsMs,
        durationSec,
        notification,
      )
      ctx.methods["pomodoro:pause"]?.(ctx.buttonId)
      return
    }
    // idle / finished / malformed → paused-at-full from register() is the
    // correct presentation; normalize persisted so tap starts fresh.
    if (persisted.status !== "idle") {
      writePersisted(ctx, {
        status: "idle",
        startTsMs: null,
        durationSec,
        remainingSec: null,
      })
    }
  },
  onTap: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC

    // idle → start
    if (persisted.status === "idle") {
      const startTsMs = Date.now()
      writePersisted(ctx, {
        status: "running",
        startTsMs,
        durationSec,
        remainingSec: durationSec,
      })
      ctx.methods["pomodoro:start"]?.(
        ctx.buttonId,
        durationSec,
        ctx.config?.notification,
      )
      return
    }
    // running → pause
    if (persisted.status === "running") {
      const elapsedSec =
        typeof persisted.startTsMs === "number"
          ? (Date.now() - persisted.startTsMs) / 1000
          : 0
      const remaining = Math.max(0, Math.ceil(durationSec - elapsedSec))
      writePersisted(ctx, {
        status: "paused",
        startTsMs: persisted.startTsMs,
        durationSec,
        remainingSec: remaining,
      })
      ctx.methods["pomodoro:pause"]?.(ctx.buttonId)
      return
    }
    // paused → resume
    if (persisted.status === "paused" && persisted.remainingSec !== null) {
      const startTsMs =
        Date.now() - (durationSec - persisted.remainingSec) * 1000
      writePersisted(ctx, {
        status: "running",
        startTsMs,
        durationSec,
        remainingSec: null,
      })
      ctx.methods["pomodoro:resume"]?.(ctx.buttonId)
      return
    }
    // ponytail: when time is over, tap returns to the initial state —
    // the counter at max, awaiting another tap. The user must tap a
    // second time to actually start a fresh countdown. The blink
    // animation stops as soon as the global runtime re-seeds to
    // paused-at-full via pomodoro:register.
    if (persisted.status === "finished") {
      writePersisted(ctx, {
        status: "idle",
        startTsMs: null,
        durationSec,
        remainingSec: null,
      })
      ctx.methods["pomodoro:register"]?.(
        ctx.buttonId,
        durationSec,
        ctx.config?.notification,
      )
      return
    }
    // truly fresh state (idle): present paused-at-full. register() seeds
    // the global runtime; the frontend shows the configured time and
    // waits for the user to tap again to begin a countdown.
    ctx.methods["pomodoro:register"]?.(
      ctx.buttonId,
      durationSec,
      ctx.config?.notification,
    )
  },
  onDblTap: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    // ponytail: when time is over, dbl-tap returns to the initial state
    // AND starts a fresh countdown immediately. Symmetric counterpart
    // to onTap which only resets. The blink animation is interrupted
    // when status flips back to running.
    const persisted = getPersisted(ctx)
    if (persisted.status !== "finished") return
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
    const startTsMs = Date.now()
    writePersisted(ctx, {
      status: "running",
      startTsMs,
      durationSec,
      remainingSec: durationSec,
    })
    ctx.methods["pomodoro:start"]?.(
      ctx.buttonId,
      durationSec,
      ctx.config?.notification,
    )
  },
  onHold: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
    writePersisted(ctx, {
      status: "idle",
      startTsMs: null,
      durationSec,
      remainingSec: null,
    })
    ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
  },
  dispose: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
  },
}
