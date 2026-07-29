import { z } from "astro/zod"

export const DocFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  audience: z.enum(["user", "developer", "addon", "theme"]).default("user"),
  order: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
})

export type DocFrontmatter = z.infer<typeof DocFrontmatterSchema>
