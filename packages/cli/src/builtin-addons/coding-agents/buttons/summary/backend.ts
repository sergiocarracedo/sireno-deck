// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "../../types/types.js"

import { AGENTS_DECK_BASE } from "../../shared/live-count.js"
import { configSchema, type SummaryConfig } from "./config.js"

interface CoreMethodsShape {
  navigateToDeck: (args: { id: string; addToHistory?: boolean }) => void
}

const methodsFor = (ctx: AddonButtonServiceContext<SummaryConfig>) =>
  ctx.methods as Readonly<Record<string, (...args: unknown[]) => unknown>>

// ponytail: the agents deck is dynamic (pages depend on live session count),
// so the navigation target resolves from the global service at tap time —
// `-p1` when paginated, the base id when a single page exists.
const deckTargetFor = (
  ctx: AddonButtonServiceContext<SummaryConfig>,
): string => {
  const get = methodsFor(ctx)["coding-agents:getDeckTarget"]
  if (typeof get === "function") {
    const target = get() as unknown
    if (typeof target === "string" && target.length > 0) return target
  }
  return AGENTS_DECK_BASE
}

export default {
  configSchema,
  gestureHandlers: ["tap"] as const,
  onMount: (_ctx: AddonButtonServiceContext<SummaryConfig>): void => {},
  onTap: (ctx: AddonButtonServiceContext<SummaryConfig>): void => {
    const target = deckTargetFor(ctx)
    const core = ctx.coreMethods as CoreMethodsShape | undefined
    if (core?.navigateToDeck) {
      core.navigateToDeck({ id: target, addToHistory: true })
      return
    }
    const fallback = methodsFor(ctx)["coding-agents:open"]
    if (typeof fallback === "function") {
      ;(fallback as (a: { id: string }) => void)({ id: target })
    }
  },
  dispose: (_ctx: AddonButtonServiceContext<SummaryConfig>): void => {},
} satisfies AddonButtonTypeService<SummaryConfig>
