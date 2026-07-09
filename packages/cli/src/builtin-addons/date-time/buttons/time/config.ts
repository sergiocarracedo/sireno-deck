import { z } from "zod"

export const configSchema = z
  .object({
    variant: z.enum(["default", "big"]).optional().default("default"),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
