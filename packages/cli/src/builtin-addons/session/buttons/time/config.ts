import { z } from "zod"

export const configSchema = z.object({
  format: z.string().default("HH:mm").meta({ title: "Time format" }),
})
export type ConfigSchema = z.infer<typeof configSchema>
