import { z } from "zod"

export const agentConfigSchema = z
  .object({
    providerId: z.enum(["opencode", "claude-code"]).optional(),
    sessionId: z.string().min(1).optional(),
  })
  .strict()
  .default({})

export type AgentConfig = z.infer<typeof agentConfigSchema>
