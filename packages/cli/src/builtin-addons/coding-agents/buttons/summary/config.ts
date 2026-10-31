import { z } from "zod"

export const configSchema = z
  .object({
    showCount: z.boolean().default(true).meta({
      title: "Show count",
      description:
        "Show the number of discovered agent sessions on the summary tile.",
    }),
    attentionOnly: z.boolean().default(false).meta({
      title: "Attention only",
      description:
        "Show the attention state only when a session needs attention; otherwise show the normal summary.",
    }),
    fallingLetters: z.boolean().default(true).meta({
      title: "Falling letters",
      description:
        "Show the animated falling-letter background on the summary tile.",
    }),
  })
  .strict()

export type SummaryConfig = z.infer<typeof configSchema>
