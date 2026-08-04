import { z } from "zod"

export const ThemeColorTokenSchema = z
  .object({
    background: z.string().min(1),
    frame: z.string().min(1),
    foreground: z.string().min(1),
    "foreground-contrast": z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    muted: z.string().min(1).optional(),
    success: z.string().min(1),
    danger: z.string().min(1),
  })
  .strict()

/**
 * Required variant keys every theme must declare. Addons can rely on these
 * five for highlights, warnings, success and error states without falling
 * back to a hardcoded palette.
 *
 * Themes may declare EXTRA variants on top — those surface as `--sireno-variant-<name>-*`
 * CSS vars and become available to user config.
 */
export const REQUIRED_VARIANT_KEYS = ["default", "error"] as const

export type RequiredVariantKey = (typeof REQUIRED_VARIANT_KEYS)[number]

const ThemeVariantTokenOverridesSchema = z
  .object({
    primary: z.string().min(1).optional(),
    accent: z.string().min(1).optional(),
    foreground: z.string().min(1).optional(),
    "foreground-contrast": z.string().min(1).optional(),
    success: z.string().min(1).optional(),
    danger: z.string().min(1).optional(),
    muted: z.string().min(1).optional(),
  })
  .strict()

export const ThemeVariantStylesSchema = z
  .object({
    background: z.string().min(1),
    border: z.string().min(1),
    foreground: z.string().min(1),
    glow: z.string().optional(),
    tokens: ThemeVariantTokenOverridesSchema.optional(),
  })
  .strict()

export const ThemeVariantsSchema = z
  .record(z.string().min(1), ThemeVariantStylesSchema)
  .superRefine((variants, ctx) => {
    const missing = REQUIRED_VARIANT_KEYS.filter((k) => !(k in variants))
    if (missing.length === 0) return
    for (const key of missing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `theme manifest is missing required variant "${key}" — every theme must declare variants: { ${REQUIRED_VARIANT_KEYS.map((k) => `"${k}"`).join(", ")} } at minimum`,
      })
    }
  })

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
    /**
     * Optional variable-font axes — accepts a [min, max] tuple per axis.
     * When set, css.ts emits a single @font-face with `font-weight: from..to`
     * shorthand so one entry can serve a range without duplicating files.
     */
    axes: z
      .object({
        weight: z.tuple([z.number().int(), z.number().int()]).optional(),
        slant: z.tuple([z.number(), z.number()]).optional(),
        width: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
  })
  .strict()

export const ThemeEffectsSchema = z
  .object({
    glow: z
      .object({
        sm: z.string().min(1),
        md: z.string().min(1),
        lg: z.string().min(1),
      })
      .partial()
      .optional(),
    shadow: z
      .object({
        soft: z.string().min(1),
        hard: z.string().min(1),
      })
      .partial()
      .optional(),
    blur: z
      .object({
        sm: z.string().min(1),
        md: z.string().min(1),
      })
      .partial()
      .optional(),
  })
  .strict()
  .optional()

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
    effects: ThemeEffectsSchema,
    variants: ThemeVariantsSchema,
    assets: ThemeAssetsSchema.optional(),
    "ui-overrides": z.string().min(1).optional(),
  })
  .strict()

export type ThemeJsonManifest = z.infer<typeof ThemeJsonManifestSchema>

export type ThemeColorToken = keyof z.infer<typeof ThemeColorTokenSchema>

export type ThemeTypographyRole = keyof z.infer<typeof ThemeTypographySchema>

export type ThemeVariantStyles = z.infer<typeof ThemeVariantStylesSchema>

export type ThemeVariantName = string

export type ThemeVariants = z.infer<typeof ThemeVariantsSchema>
