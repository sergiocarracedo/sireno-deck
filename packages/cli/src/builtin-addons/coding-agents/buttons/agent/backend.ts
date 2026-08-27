// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "../../types/types.js"

import { agentConfigSchema, type AgentConfig } from "./config.js"

const methodsFor = (ctx: AddonButtonServiceContext<AgentConfig>) =>
  ctx.methods as Readonly<Record<string, (...args: unknown[]) => unknown>>

const callFocus = (ctx: AddonButtonServiceContext<AgentConfig>): void => {
  const focus = methodsFor(ctx)["coding-agents:focus"]
  if (typeof focus === "function") {
    void (focus as (a: string) => unknown)(ctx.buttonId)
  }
}

const callDismiss = (ctx: AddonButtonServiceContext<AgentConfig>): void => {
  const dismiss = methodsFor(ctx)["coding-agents:dismissAttention"]
  if (typeof dismiss === "function") {
    ;(dismiss as (a: string) => unknown)(ctx.buttonId)
  }
}

export default {
  configSchema: agentConfigSchema,
  gestureHandlers: ["tap", "hold"] as const,
  onMount: (_ctx: AddonButtonServiceContext<AgentConfig>): void => {},
  onTap: (ctx: AddonButtonServiceContext<AgentConfig>): void => {
    callFocus(ctx)
  },
  onHold: (ctx: AddonButtonServiceContext<AgentConfig>): void => {
    callDismiss(ctx)
  },
  dispose: (_ctx: AddonButtonServiceContext<AgentConfig>): void => {},
} satisfies AddonButtonTypeService<AgentConfig>
