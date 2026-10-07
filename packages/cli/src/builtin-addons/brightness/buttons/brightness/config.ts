import { z } from "zod"

export const configSchema = z
  .object({
    action: z
      .enum(["up", "down", "set"])
      .optional()
      .default("up")
      .meta({ title: "Brightness action" }),
    value: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .meta({ title: "Brightness (%)" }),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
