import { z } from "zod"

export const configSchema = z
  .object({
    slot: z.enum([
      "hour",
      "hour-tens",
      "hour-ones",
      "separator",
      "minute",
      "minute-tens",
      "minute-ones",
    ]),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
