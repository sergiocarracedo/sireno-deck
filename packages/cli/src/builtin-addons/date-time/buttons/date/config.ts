import { z } from "zod"

export const configSchema = z
  .object({
    locale: z.string().min(2).max(35).optional().meta({ title: "Locale" }),
    time_zone: z.string().min(1).optional().meta({ title: "Time zone" }),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
