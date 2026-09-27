import { z } from "zod"

export const configSchema = z
  .object({
    showCount: z.boolean().default(true).meta({ title: "Show count" }),
    attentionOnly: z.boolean().default(false).meta({ title: "Attention only" }),
    fallingLetters: z
      .boolean()
      .default(true)
      .meta({ title: "Falling letters" }),
  })
  .strict()

export type SummaryConfig = z.infer<typeof configSchema>
