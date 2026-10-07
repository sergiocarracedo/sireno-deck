import { z } from "zod"

export const configSchema = z.object({
  target_deck: z.string().min(1).meta({ title: "Target deck" }),
  icon: z.string().min(1).meta({ title: "Icon", "x-control": "icon" }),
  label: z.string().min(1).meta({ title: "Label" }),
})
export type ConfigSchema = z.infer<typeof configSchema>
