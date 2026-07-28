import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "@/addon/api"

import {
  configSchema,
  DEFAULT_DURATION_SEC,
  type ConfigSchema,
  type PersistedState,
} from "./config"

const ADDON_NAME = "pomodoro"

const getPersisted = (
  ctx: AddonButtonServiceContext<ConfigSchema>,
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
  ctx: AddonButtonServiceContext<ConfigSchema>,
  next: PersistedState,
): void => {
  const scope = ctx.store.buttonScope<PersistedState>(ADDON_NAME, ctx.buttonId)
  scope.set("state", next)
}

const fireCompletionNotification = (
  ctx: AddonButtonServiceContext<ConfigSchema>,
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
  onMount: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC
    ctx.methods["pomodoro:register"]?.(ctx.buttonId, durationSec)
    if (
      persisted.status === "running" &&
      typeof persisted.startTsMs === "number"
    ) {
      const elapsedSec = (Date.now() - persisted.startTsMs) / 1000
      if (elapsedSec >= durationSec) {
        // ponytail: timer ran past its deadline while daemon was down — mark
        // finished immediately rather than scheduling a delayed wake-up.
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
  onTap: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    const persisted = getPersisted(ctx)
    const durationSec = ctx.config?.durationSec ?? DEFAULT_DURATION_SEC

    if (persisted.status === "idle") {
      const startTsMs = Date.now()
      writePersisted(ctx, { status: "running", startTsMs, durationSec })
      ctx.methods["pomodoro:start"]?.(ctx.buttonId, durationSec)
      return
    }
    if (persisted.status === "running") {
      writePersisted(ctx, {
        status: "idle",
        startTsMs: null,
        durationSec,
      })
      ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
      return
    }
    // finished → reset and start a fresh cycle
    const startTsMs = Date.now()
    writePersisted(ctx, { status: "running", startTsMs, durationSec })
    ctx.methods["pomodoro:start"]?.(ctx.buttonId, durationSec)
  },
  dispose: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    ctx.methods["pomodoro:stop"]?.(ctx.buttonId)
  },
} satisfies AddonButtonTypeService<ConfigSchema>