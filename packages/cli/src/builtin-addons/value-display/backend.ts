import type { AddonServiceContext, AddonGlobalService } from "@/addon/api"

import type { ConfigSchema } from "./buttons/value-display/config"

const DEFAULT_POLL_MS = 5000

const buttonRegistry = new Map<string, ConfigSchema>()
let ctxRef: AddonServiceContext | undefined

export const globalService: AddonGlobalService = {
  methods: {
    registerValues: (buttonId: unknown, config: unknown): void => {
      buttonRegistry.set(String(buttonId), config as ConfigSchema)
      ctxRef?.poll("values")
    },
    unregisterValues: (buttonId: unknown): void => {
      buttonRegistry.delete(String(buttonId))
    },
  },
  pollers: [
    {
      id: "values",
      channel: "value-display:values",
      intervalMs: DEFAULT_POLL_MS,
      poll: async (ctx: AddonServiceContext) => {
        const byButton: Record<
          string,
          Array<{
            label: string
            value: string
            units?: string
          }>
        > = {}
        if (buttonRegistry.size === 0) return { byButton }

        await Promise.all(
          [...buttonRegistry.entries()].map(async ([buttonId, config]) => {
            const results = await Promise.all(
              config.values.map(async (entry) => {
                try {
                  const res = await ctx.executor.run(entry.command, {
                    timeoutMs: entry.timeout_ms ?? config.timeout_ms,
                  })
                  const raw = res.stdout ?? ""
                  let value: string
                  switch (entry.formatter) {
                    case "strip":
                      value = raw.replace(/\s+$/, "")
                      break
                    case "line":
                      value = (
                        raw.indexOf("\n") === -1
                          ? raw
                          : raw.slice(0, raw.indexOf("\n"))
                      ).trim()
                      break
                    case "raw":
                    default:
                      value = raw.trim()
                      break
                  }
                  return { label: entry.label, value, units: entry.units }
                } catch {
                  return {
                    label: entry.label,
                    value: "err",
                    units: entry.units,
                  }
                }
              }),
            )
            byButton[buttonId] = results
          }),
        )
        return { byButton }
      },
    },
  ],
  onLoad: async (ctx: AddonServiceContext) => {
    ctxRef = ctx
  },
  onUnload: () => {
    ctxRef = undefined
    buttonRegistry.clear()
  },
}
