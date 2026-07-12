import { z } from "zod"

export const configSchema = z
  .object({
    deck: z.string().min(1),
    addToHistory: z.boolean().default(true),
    icon: z.string().optional(),
    label: z.string().optional(),
  })
  .refine((c) => Boolean(c.icon) || Boolean(c.label), {
    message: "core:change-deck requires at least one of 'icon' or 'label'",
  })
export type ConfigSchema = z.infer<typeof configSchema>
