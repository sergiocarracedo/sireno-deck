import { z } from "zod"

export const configSchema = z
  .object({
    icon: z.string().optional(),
    label: z.string().optional(),
  })
  .refine((c) => Boolean(c.icon) || Boolean(c.label), {
    message: "core:action requires at least one of 'icon' or 'label'",
  })
export type ConfigSchema = z.infer<typeof configSchema>
