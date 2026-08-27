import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"
import { docsLoader } from "@astrojs/starlight/loaders"
import { docsSchema } from "@astrojs/starlight/schema"

const addonCategory = z.enum(["builtin", "community"])
const themeCategory = z.enum(["builtin", "community", "third-party"])

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema(),
  }),

  addons: defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/addons" }),
    schema: z.object({
      displayName: z.string(),
      description: z.string(),
      category: addonCategory,
      tags: z.array(z.string()).default([]),
      icon: z.string().default("puzzle"),
      buttonTypes: z.array(z.string()).default([]),
      npm: z.string().optional(),
      repo: z.string().optional(),
      screenshot: z.string().optional(),
      order: z.number().default(100),
    }),
  }),

  themes: defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/themes" }),
    schema: z.object({
      displayName: z.string(),
      description: z.string(),
      category: themeCategory,
      tags: z.array(z.string()).default([]),
      palette: z
        .object({
          background: z.string(),
          frame: z.string(),
          foreground: z.string(),
          primary: z.string(),
          accent: z.string(),
        })
        .strict(),
      preview: z.string().optional(),
      repo: z.string().optional(),
      npm: z.string().optional(),
      order: z.number().default(100),
    }),
  }),
}
