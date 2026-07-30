import { createContext, createElement, useContext, type ReactElement } from "react"
import type { CSSProperties } from "react"

/**
 * Local mirror of the Sireno Deck theme presentation contract.
 *
 * The real contract lives at `packages/cli/src/ui/theme-presentation.tsx`.
 * Cross-package TS resolution and the difference in `verbatimModuleSyntax`
 * settings make pulling the live type in from the videos workspace expensive.
 * When the marketing-site project reaches Phase D and starts rendering real
 * `ButtonFrame` instances, this module is swapped for a re-export from a
 * shared types package — not a relative path into `packages/cli/src`.
 *
 * The shape here mirrors `ThemeUiPresentation` upstream so the eventual swap
 * is mechanical.
 */
export interface ThemeUiPresentation {
  /** Override for `ButtonFrame`. */
  buttonFrame?: (props: ButtonFrameProps) => ReactElement
  /** Per-primitive overrides. */
  primitives?: {
    chip?: (props: ChipProps) => ReactElement
    icon?: (props: IconProps) => ReactElement
    text?: (props: TextProps) => ReactElement
    label?: (props: LabelProps) => ReactElement
    tapIndicator?: (props: TapIndicatorProps) => ReactElement
  }
  /** Per-surface overrides. */
  surfaces?: {
    iconLabel?: (props: IconLabelSurfaceProps) => ReactElement
    iconLabelProgress?: (props: IconLabelProgressSurfaceProps) => ReactElement
    bars?: (props: BarsProps) => ReactElement
    splitAction?: (props: SplitActionSurfaceProps) => ReactElement
    labelValueList?: (props: LabelValueListProps) => ReactElement
    temporaryError?: (props: TemporaryErrorSurfaceProps) => ReactElement
    valueChart?: (props: ValueChartProps) => ReactElement
  }
}

/* ponytail: structural type placeholders. Phase D swaps in the real props
 * type from packages/cli once a shared types package exists. */
export type ButtonFrameProps = {
  style?: CSSProperties
  children?: ReactElement
}
export type ChipProps = { style?: CSSProperties }
export type IconProps = { style?: CSSProperties; src?: string }
export type TextProps = { style?: CSSProperties; children?: string }
export type LabelProps = { style?: CSSProperties; children?: string }
export type TapIndicatorProps = { style?: CSSProperties }
export type IconLabelSurfaceProps = { style?: CSSProperties; label?: string }
export type IconLabelProgressSurfaceProps = {
  style?: CSSProperties
  label?: string
  progress?: number
}
export type BarsProps = { style?: CSSProperties; values?: number[] }
export type SplitActionSurfaceProps = { style?: CSSProperties; label?: string }
export interface LabelValueListProps {
  style?: CSSProperties
  items?: string[]
}
export interface TemporaryErrorSurfaceProps {
  style?: CSSProperties
  error?: string
}
export interface ValueChartProps {
  style?: CSSProperties
  values?: number[]
}

const ThemeUiPresentationContext = createContext<ThemeUiPresentation | undefined>(undefined)

export const ThemeUiPresentationProvider = (props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement => {
  return createElement(
    ThemeUiPresentationContext.Provider,
    { value: props.presentation },
    props.children,
  )
}

export const useThemeUiPresentation = (): ThemeUiPresentation | undefined => {
  return useContext(ThemeUiPresentationContext)
}
