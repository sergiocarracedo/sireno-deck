import { z } from "zod"

export const configSchema = z
  .object({
    locale: z.string().min(2).max(35).optional(),
    time_zone: z.string().min(1).optional(),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
