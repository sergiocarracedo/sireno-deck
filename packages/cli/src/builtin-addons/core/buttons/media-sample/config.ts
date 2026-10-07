import { z } from "zod"

export const configSchema = z.object({
  channel: z.string().min(1).meta({ title: "Data channel" }),
  fallback: z.unknown().optional().meta({ title: "Fallback value" }),
})
export type ConfigSchema = z.infer<typeof configSchema>
