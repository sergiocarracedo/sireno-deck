import type { CoreMethods } from "../../types"
import {
  configSchema,
  DEFAULT_DURATION_SEC,
  type ConfigSchema,
  type PersistedState,
} from "./config"

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
    return { status: "idle", startTsMs: null, durationSec }
  }
  return value
}

const writePersisted = (
  ctx: ButtonServiceContextLike<ConfigSchema>,
  next: PersistedState,
): void => {
  const scope = ctx.store.buttonScope<PersistedState>(ADDON_NAME, ctx.buttonId)
  scope.set("state", next)
}

const fireCompletionNotification = (
  ctx: ButtonServiceContextLike<ConfigSchema>,
): void => {
  void ctx.coreMethods.notify({
    title: "Pomodoro",
    body: "Time's up!",
    sound: true,
  })
}

export default {
  configSchema,
  defaultRenderIntervalMs: 1000,
  onMount: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
    ctx.methods["pomodoro:register"]?.(ctx.buttonId, durationSec)
    if (
      persisted.status === "running" &&
      typeof persisted.startTsMs === "number"
    ) {
      const elapsedSec = (Date.now() - persisted.startTsMs) / 1000
      if (elapsedSec >= durationSec) {
        writePersisted(ctx, {
          status: "finished",
          startTsMs: persisted.startTsMs,
          durationSec,
        })
        fireCompletionNotification(ctx)
      } else {
        ctx.methods["pomodoro:startWith"]?.(
          ctx.buttonId,
          persisted.startTsMs,
          durationSec,
        )
      }
    }
  },
  onTap: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC

    if (persisted.status === "idle") {
      const startTsMs = Date.now()
      writePersisted(ctx, { status: "running", startTsMs, durationSec })
      ctx.methods["pomodoro:start"]?.(ctx.buttonId, durationSec)
      return
    }
    if (persisted.status === "running") {
      writePersisted(ctx, { status: "idle", startTsMs: null, durationSec })
      ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
      return
    }
    const startTsMs = Date.now()
    writePersisted(ctx, { status: "running", startTsMs, durationSec })
    ctx.methods["pomodoro:start"]?.(ctx.buttonId, durationSec)
  },
  dispose: (ctx: ButtonServiceContextLike<ConfigSchema>): void => {
    ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
  },
}
