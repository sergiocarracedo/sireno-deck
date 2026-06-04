import {
  ChipTone,
  IconTone,
  TextAlign,
  TextFit,
  TextSize,
  TextTone,
  TextTypography,
} from '@/ui'
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

export interface ThemeIconPresentationProps {
  children: ReactElement
  decorative: boolean
  source: 'asset' | 'brand' | 'generic'
  tone?: IconTone
}

export interface ThemeChipPresentationProps {
  children: ReactElement
  tone: ChipTone
}

export interface ThemeTextPresentationProps {
  align: TextAlign
  children: ReactElement
  fit: TextFit
  tone: TextTone
  typography: TextTypography
  size: TextSize
}

export interface ThemeUiPresentation {
  chip?: (props: ThemeChipPresentationProps) => ReactElement
  icon?: (props: ThemeIconPresentationProps) => ReactElement
  text?: (props: ThemeTextPresentationProps) => ReactElement
}

export type ThemeColorToken = (typeof colorTokens)[number]

export interface ThemeMediaPlayerSurfaceProps {
  artist: string
  progress: number
  source: string
  status:
    | 'play'
    | 'pause'
    | 'stop'
    | 'notAvailable'
    | 'unsupported'
  time: string
  title: string
}

export type ThemeMediaPlayerSurface = (
  props: ThemeMediaPlayerSurfaceProps,
) => ReactElement

export interface Theme extends Omit<ThemeSchemaOutput, 'typography'> {
  accent: string
  background: string
  buttonFrame: ThemeButtonFrame
  danger: string
  filePaths: string[]
  frame: string
  mediaPlayerSurface?: ThemeMediaPlayerSurface
  primary: string
  rootDir: string
  stylesheets: string[]
  success: string
  tailwindSafelist: string[]
  typography?: ThemeSchemaOutput['typography']
  ui?: ThemeUiPresentation
  colorTokens: { [K in ThemeColorToken]: string }
}
