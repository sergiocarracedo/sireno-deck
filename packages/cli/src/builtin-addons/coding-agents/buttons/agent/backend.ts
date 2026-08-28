// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type {
  AddonButtonServiceContext,
  AddonButtonTypeService,
} from "../../types/types.js"
import { agentConfigSchema, type AgentConfig } from "./config.js"
import { agentAtSlot } from "../../shared/snapshot.js"
import type { AgentsSnapshot, ProviderId } from "../../shared/state.js"

const shq = (value: string): string => `'${value.replaceAll(`'`, `'\\''`)}'`

// ponytail: focus can't reliably foreground the exact terminal/tmux pane an
// agent runs in (no window-activation CLI on GNOME Wayland), so we spawn a
// terminal in the session's project dir resuming it. claude --resume and
// opencode --session N both support this. The launcher picks xdg-terminal-exec
// then gnome-terminal; both accept `-- <cmd>`.
const runFocus = async (
  ctx: AddonButtonServiceContext<AgentConfig>,
  agent: { providerId: ProviderId; sessionId: string; directory?: string },
): Promise<void> => {
  const dir = agent.directory
  const prefix = dir && dir.length > 0 ? `cd ${shq(dir)} && ` : ""
  const resume =
    agent.providerId === "opencode"
      ? `${prefix}opencode --session ${shq(agent.sessionId)}`
      : `${prefix}claude --resume ${shq(agent.sessionId)}`
  const cmd =
    `t=$(command -v xdg-terminal-exec || command -v gnome-terminal); ` +
    `[ -n "$t" ] && nohup "$t" -- bash -c ${shq(resume)} >/dev/null 2>&1 &`
  await ctx.executor.run(cmd)
}

const methodsFor = (ctx: AddonButtonServiceContext<AgentConfig>) =>
  ctx.methods as Readonly<Record<string, (...args: unknown[]) => unknown>>

const resolveSlotAgent = (
  ctx: AddonButtonServiceContext<AgentConfig>,
): { providerId: ProviderId; sessionId: string; directory?: string } | null => {
  const get = methodsFor(ctx)["coding-agents:getSnapshot"]
  if (typeof get !== "function") return null
  const snapshot = get() as AgentsSnapshot | undefined
  if (!snapshot) return null
  const agent = agentAtSlot(snapshot, ctx.config?.slot ?? 0)
  return agent
    ? {
        providerId: agent.providerId,
        sessionId: agent.sessionId,
        directory: agent.directory,
      }
    : null
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
  onTap: async (ctx: AddonButtonServiceContext<AgentConfig>): Promise<void> => {
    const agent = resolveSlotAgent(ctx)
    if (agent) await runFocus(ctx, agent)
  },
  onHold: (ctx: AddonButtonServiceContext<AgentConfig>): void => {
    callDismiss(ctx)
  },
  dispose: (_ctx: AddonButtonServiceContext<AgentConfig>): void => {},
} satisfies AddonButtonTypeService<AgentConfig>
