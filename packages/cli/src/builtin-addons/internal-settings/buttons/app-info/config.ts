import { z } from "zod"

export const configSchema = z
  .object({
    icon: z
      .string()
      .min(1)
      .optional()
      .default("addon://internal-settings/logo72x72.png")
      .meta({ title: "Icon", "x-control": "icon" }),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>
