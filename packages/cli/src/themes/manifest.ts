import { z } from "zod"

export const ThemeColorTokenSchema = z
  .object({
    background: z.string().min(1),
    frame: z.string().min(1),
    foreground: z.string().min(1),
    "foreground-contrast": z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    success: z.string().min(1),
    danger: z.string().min(1),
  })
  .strict()

export const ThemeTypographyRoleSchema = z
  .object({
    fontFamily: z.string().min(1),
    fontSize: z.number().positive(),
    fontWeight: z.number().int().positive(),
    letterSpacing: z.number().optional(),
  })
  .strict()

export const ThemeTypographySchema = z
  .object({
    main_text: ThemeTypographyRoleSchema,
    auxiliary_text: ThemeTypographyRoleSchema,
    monospace: ThemeTypographyRoleSchema,
  })
  .strict()

export const ThemeFontFaceSchema = z
  .object({
    fontFamily: z.string().min(1),
    fontWeight: z.number().int().positive(),
    fontStyle: z.enum(["normal", "italic", "oblique"]).default("normal"),
    src: z.string().min(1),
  })
  .strict()

export const ThemeAssetsSchema = z
  .object({
    styles: z.array(z.string().min(1)).default([]),
  })
  .strict()

export const ThemeJsonManifestSchema = z
  .object({
    kind: z.literal("theme"),
    apiVersion: z.number().int().positive(),
    name: z.string().min(1),
    version: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    colorTokens: ThemeColorTokenSchema,
    typography: ThemeTypographySchema,
    fonts: z.array(ThemeFontFaceSchema).default([]),
    assets: ThemeAssetsSchema.optional(),
    "ui-overrides": z.string().min(1).optional(),
  })
  .strict()

export type ThemeJsonManifest = z.infer<typeof ThemeJsonManifestSchema>

export type ThemeColorToken = keyof z.infer<typeof ThemeColorTokenSchema>

export type ThemeTypographyRole = keyof z.infer<typeof ThemeTypographySchema>
