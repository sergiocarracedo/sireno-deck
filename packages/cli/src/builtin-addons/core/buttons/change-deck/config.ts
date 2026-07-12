import { z } from "zod"

import { IconSourceSchema } from "@/config/schemas"

export const configSchema = z
  .object({
    deck: z.string().min(1),
    addToHistory: z.boolean().default(true),
    icon: IconSourceSchema.optional(),
    label: z.string().optional(),
  })
  .refine((c) => Boolean(c.icon) || Boolean(c.label), {
    message: "core:change-deck requires at least one of 'icon' or 'label'",
  })
export type ConfigSchema = z.infer<typeof configSchema>
