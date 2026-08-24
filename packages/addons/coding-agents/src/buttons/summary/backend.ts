import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "../../types/types"

import { summaryConfigSchema, type SummaryConfig } from "./config"

interface CoreMethodsShape {
  navigateToDeck: (args: { id: string; addToHistory?: boolean }) => void
}

const methodsFor = (ctx: AddonButtonServiceContext<SummaryConfig>) =>
  ctx.methods as Readonly<Record<string, (...args: unknown[]) => unknown>>

export default {
  configSchema: summaryConfigSchema,
  gestureHandlers: ["tap"] as const,
  onMount: (_ctx: AddonButtonServiceContext<SummaryConfig>): void => {},
  onTap: (ctx: AddonButtonServiceContext<SummaryConfig>): void => {
    const core = ctx.coreMethods as CoreMethodsShape | undefined
    if (core?.navigateToDeck) {
      core.navigateToDeck({ id: "coding-agents:agents", addToHistory: true })
      return
    }
    const fallback = methodsFor(ctx)["coding-agents:open"]
    if (typeof fallback === "function") {
      ;(fallback as (a: { id: string }) => void)({
        id: "coding-agents:agents",
      })
    }
  },
  dispose: (_ctx: AddonButtonServiceContext<SummaryConfig>): void => {},
} satisfies AddonButtonTypeService<SummaryConfig>
