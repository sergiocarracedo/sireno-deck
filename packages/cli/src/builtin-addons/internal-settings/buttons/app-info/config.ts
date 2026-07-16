import { z } from "zod"

export const configSchema = z
  .object({
    icon: z.string().min(1).optional().default("icon://info"),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
