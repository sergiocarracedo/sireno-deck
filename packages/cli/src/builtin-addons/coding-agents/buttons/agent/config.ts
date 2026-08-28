import { z } from "zod"

export const agentConfigSchema = z
  .object({
    // ponytail: slot tiles are materialized once; which agent a slot shows
    // is resolved from the live snapshot (agentAtSlot). Explicit
    // providerId/sessionId pinning was never reachable (button ids are
    // positional), so it's gone.
    slot: z.number().int().min(0).default(0),
  })
  .strict()

export type AgentConfig = z.infer<typeof agentConfigSchema>
