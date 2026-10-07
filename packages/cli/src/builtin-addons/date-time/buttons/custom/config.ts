import { z } from "zod"

export const configSchema = z
  .object({
    format: z.string().min(1).optional().default("DD/MM/YYYY HH:mm:ss").meta({
      title: "Date and time format",
      description:
        "Tokens: YYYY/YY, MMMM/MMM/MM/M, dddd/ddd/d, DD/D, HH/H, hh/h, mm/m, ss/s, SSS, A/a. Rich tags: <strong>, <highlight>, <blink>, <dim>, <accent>, <danger>, <foreground>, <primary>, <success>, and <xxs> through <5xl>. Use &nbsp; for a non-breaking space.",
    }),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
