import { z } from "zod"

export const configSchema = z.object({
  step: z
    .number()
    .positive()
    .max(100)
    .default(5)
    .meta({ title: "Brightness step" }),
})
export type ConfigSchema = z.infer<typeof configSchema>
