import type { Methods } from "@/deck/methods"
import type { Store } from "@/core/store"
import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "@/addon/api"

import {
  configSchema,
  isStatusToggleConfig,
  type ConfigSchema,
  type LegacyToggleConfig,
  type StatusToggleConfig,
} from "./config"

// ponytail: bridge namespaces addon-global methods as `${addonName}:${methodName}`.
// core addon's method names are `register` / `unregister` / `republish` / `lookup`,
// so the namespaced keys are `core:register` etc.
const REG_METHOD = "core:register"
const UNREG_METHOD = "core:unregister"
const REPUBLISH_METHOD = "core:republish"
const LOOKUP_METHOD = "core:lookup"

interface ToggleStateLike {
  readonly raw: string
  readonly state: string | undefined
  readonly error?: string
  readonly at: number
}

export default {
  configSchema,
  onMount: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    if (!isStatusToggleConfig(ctx.config)) return
    const register = (
      ctx.methods as unknown as Record<
        string,
        ((...a: unknown[]) => unknown) | undefined
      >
    )[REG_METHOD]
    register?.(ctx.buttonId, ctx.config)
  },
  dispose: (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    if (!isStatusToggleConfig(ctx.config)) return
    const unregister = (
      ctx.methods as unknown as Record<
        string,
        ((...a: unknown[]) => unknown) | undefined
      >
    )[UNREG_METHOD]
    unregister?.(ctx.buttonId)
  },
  onTap: async (ctx: AddonButtonServiceContext<ConfigSchema>) => {
    const { config, methods, store, coreMethods, buttonId } =
      ctx as unknown as {
        config: ConfigSchema
        methods: Methods
        store: Store
        coreMethods: Methods
        buttonId: string
      }
    if (!isStatusToggleConfig(config)) {
      await legacyTap({ config: config as LegacyToggleConfig, methods, store })
      return
    }
    await statusTap({ config, methods, coreMethods, buttonId }, config)
  },
} satisfies AddonButtonTypeService<ConfigSchema>

const legacyTap = async (ctx: {
  config: LegacyToggleConfig
  methods: Methods
  store: Store
}): Promise<void> => {
  const scope = ctx.store.buttonScope<boolean>("core", ctx.config.key)
  const current = scope.get("value") ?? ctx.config.default
  scope.set("value", !current)
  ctx.methods.invalidate()
}

const statusTap = async (
  ctx: {
    config: StatusToggleConfig
    methods: Methods
    coreMethods: Methods
    buttonId: string
  },
  config: StatusToggleConfig,
): Promise<void> => {
  const lookup = (
    ctx.methods as unknown as Record<
      string,
      ((...a: unknown[]) => unknown) | undefined
    >
  )[LOOKUP_METHOD] as
    | ((id: unknown) => Promise<ToggleStateLike | null>)
    | undefined
  let stateKey: string | undefined
  if (lookup !== undefined) {
    const current = await lookup(ctx.buttonId)
    stateKey = current?.state
  }
  const entry = stateKey !== undefined ? config.states[stateKey] : undefined
  const command = entry?.onTap
  const republish = (
    ctx.methods as unknown as Record<
      string,
      ((...a: unknown[]) => unknown) | undefined
    >
  )[REPUBLISH_METHOD] as (() => void) | undefined
  if (command === undefined || command.length === 0) {
    // ponytail: no onTap for this state — still trigger a republish so the
    // deck reflects the latest status without waiting for the next tick.
    republish?.()
    return
  }
  await ctx.coreMethods.runCommand(command, {
    timeoutMs: config.timeoutMs,
  } as Parameters<typeof ctx.coreMethods.runCommand>[1])
  republish?.()
}
