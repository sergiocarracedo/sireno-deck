import { z } from "zod"

import { IconSourceSchema } from "@/config/schemas"

export const configSchema = z
  .object({
    icon: IconSourceSchema.optional().meta({
      title: "Icon",
      "x-control": "icon",
    }),
    label: z.string().optional().meta({ title: "Label" }),
  })
  .refine((c) => Boolean(c.icon) || Boolean(c.label), {
    message: "core:action requires at least one of 'icon' or 'label'",
  })
export type ConfigSchema = z.infer<typeof configSchema>
