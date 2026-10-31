import { z } from "zod"

export const configSchema = z
  .object({
    // ponytail: slot tiles are materialized once; which agent a slot shows
    // is resolved from the live snapshot (agentAtSlot). Explicit
    // providerId/sessionId pinning was never reachable (button ids are
    // positional), so it's gone.
    slot: z.number().int().min(0).default(0).meta({
      title: "Agent slot",
      description:
        "Zero-based position in the generated session deck. Slot 0 is the first discovered session; slots are assigned dynamically, so they are not fixed to a provider or session ID.",
    }),
  })
  .strict()

export type AgentConfig = z.infer<typeof configSchema>
