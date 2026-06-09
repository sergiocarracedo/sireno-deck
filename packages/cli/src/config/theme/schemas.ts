import { BarsProps, ChipProps, IconProps, TextProps } from '@/ui'
import { LabelProps } from '@/ui/Label'
import { IconLabelSurfaceProps } from '@/ui/surfaces/IconLabelSurface'
import { ReactElement, ReactNode } from 'react'
import { z } from 'zod'

const ThemeTypographyRoleSchema = z
  .object({
    fontFamily: z.string().min(1),
    fontSize: z.number().positive(),
    fontWeight: z.number().int().positive(),
    letterSpacing: z.number().optional(),
  })
  .strict()

const ThemeTailwindSchema = z
  .object({
    safelist: z.array(z.string().min(1)).default([]),
  })
  .strict()

export const colorTokens = [
  'accent',
  'danger',
  'foreground',
  'foreground-contrast',
  'primary',
  'success',
  'background',
  'frame',
] as const

const ThemeSchema = z
  .object({
    name: z.string().min(1),
    colorTokens: z.object(
      Object.fromEntries(
        colorTokens.map((token) => [token, z.string().min(1)]),
      ),
    ),
    typography: z
      .object({
        main_text: ThemeTypographyRoleSchema,
        auxiliary_text: ThemeTypographyRoleSchema,
        monospace: ThemeTypographyRoleSchema,
      })
      .strict(),
  })
  .strict()

export const ThemeManifestSchema = ThemeSchema.extend({
  assets: z
    .object({
      styles: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  main: z.string().min(1),
  tailwind: ThemeTailwindSchema.optional(),
}).passthrough()

type ThemeSchemaOutput = z.infer<typeof ThemeSchema>
export type ThemeManifest = z.infer<typeof ThemeManifestSchema>

export type ThemeTypographyRole = z.infer<typeof ThemeTypographyRoleSchema>
export type ThemeFrameState = 'idle' | 'tap' | 'hold'

export interface ThemeButtonFrameProps {
  children: ReactNode
  state: ThemeFrameState
}

export type ThemeButtonFrame = (props: ThemeButtonFrameProps) => ReactElement

export type ThemeChipProps = ChipProps
export type ThemeTextProps = TextProps
export type ThemeIconProps = IconProps
export type ThemeLabelProps = LabelProps

export type ThemeIconLabelSurfaceProps = IconLabelSurfaceProps
export type ThemeBarsSurfaceProps = BarsProps

export interface ThemeUiPresentation {
  chip?: (props: ThemeChipProps) => ReactElement
  icon?: (props: ThemeIconProps) => ReactElement
  text?: (props: ThemeTextProps) => ReactElement
  label?: (props: ThemeLabelProps) => ReactElement
  surfaces?: {
    iconLabel?: (props: ThemeIconLabelSurfaceProps) => ReactElement
    bars?: (props: ThemeBarsSurfaceProps) => ReactElement
  }
}

export type ThemeColorToken = (typeof colorTokens)[number]

export interface Theme extends Omit<ThemeSchemaOutput, 'typography'> {
  accent: string
  background: string
  buttonFrame: ThemeButtonFrame
  danger: string
  filePaths: string[]
  frame: string
  primary: string
  rootDir: string
  stylesheets: string[]
  success: string
  tailwindSafelist: string[]
  typography?: ThemeSchemaOutput['typography']
  ui?: ThemeUiPresentation
  colorTokens: { [K in ThemeColorToken]: string }
}
