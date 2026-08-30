import { z } from "zod"

export const summaryConfigSchema = z
  .object({
    showCount: z.boolean().default(true),
    attentionOnly: z.boolean().default(false),
    fallingLetters: z.boolean().default(true),
  })
  .strict()

export type SummaryConfig = z.infer<typeof summaryConfigSchema>
