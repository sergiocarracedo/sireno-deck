import {
  createContext,
  createElement,
  useContext,
  type ReactElement,
} from "react"
import { ButtonFrameProps } from "./ButtonFrame"
import {
  ChipProps,
  IconProps,
  LabelProps,
  ProgressBarProps,
  TapIndicatorProps,
  TextProps,
} from "./primitives"
import {
  BarsProps,
  IconLabelProgressSurfaceProps,
  IconLabelSurfaceProps,
  LabelValueListProps,
  PaginatedSurfaceProps,
  SplitActionSurfaceProps,
  TemporaryErrorSurfaceProps,
  ValueChartProps,
} from "./surfaces"

/**
 * Theme context passed to every override fn as the second argument. Lets
 * override code read sibling tokens (`ctx.tokens.primary`) without reaching
 * across the DOM/CSS to parse a CSS variable. Optional — pre-existing
 * 1-arg overrides keep working.
 */
export interface ThemeOverrideContext {
  name: string
  colorTokens: Readonly<Record<string, string>> | null
  typography: Readonly<Record<string, unknown>> | null
}

export interface ThemeUiPresentation {
  buttonFrame?: (
    props: ButtonFrameProps,
    ctx?: ThemeOverrideContext,
    base?: (props: ButtonFrameProps) => ReactElement,
  ) => ReactElement
  /**
   * Optional deck-chrome background hook. Themes can paint a full-deck
   * background (e.g. a perspective grid) behind the tiles without
   * needing core-deck patches. Receives the default `className` and
   * returns any extra classes to merge in. Returning undefined is a
   * no-op (default behavior).
   */
  deckBackground?: (props: { className: string }) => string | undefined
  primitives?: {
    chip?: (
      props: ChipProps,
      ctx?: ThemeOverrideContext,
      base?: (props: ChipProps) => ReactElement,
    ) => ReactElement
    icon?: (
      props: IconProps,
      ctx?: ThemeOverrideContext,
      base?: (props: IconProps) => ReactElement,
    ) => ReactElement
    text?: (
      props: TextProps,
      ctx?: ThemeOverrideContext,
      base?: (props: TextProps) => ReactElement,
    ) => ReactElement
    label?: (
      props: LabelProps,
      ctx?: ThemeOverrideContext,
      base?: (props: LabelProps) => ReactElement,
    ) => ReactElement
    tapIndicator?: (
      props: TapIndicatorProps,
      ctx?: ThemeOverrideContext,
      base?: (props: TapIndicatorProps) => ReactElement,
    ) => ReactElement
    progressBar?: (
      props: ProgressBarProps,
      ctx?: ThemeOverrideContext,
      base?: (props: ProgressBarProps) => ReactElement,
    ) => ReactElement
  }
  surfaces?: {
    iconLabel?: (
      props: IconLabelSurfaceProps,
      ctx?: ThemeOverrideContext,
      base?: (props: IconLabelSurfaceProps) => ReactElement,
    ) => ReactElement
    iconLabelProgress?: (
      props: IconLabelProgressSurfaceProps,
      ctx?: ThemeOverrideContext,
      base?: (props: IconLabelProgressSurfaceProps) => ReactElement,
    ) => ReactElement
    bars?: (
      props: BarsProps,
      ctx?: ThemeOverrideContext,
      base?: (props: BarsProps) => ReactElement,
    ) => ReactElement
    splitAction?: (
      props: SplitActionSurfaceProps,
      ctx?: ThemeOverrideContext,
      base?: (props: SplitActionSurfaceProps) => ReactElement,
    ) => ReactElement
    labelValueList?: (
      props: LabelValueListProps,
      ctx?: ThemeOverrideContext,
      base?: (props: LabelValueListProps) => ReactElement,
    ) => ReactElement
    temporaryError?: (
      props: TemporaryErrorSurfaceProps,
      ctx?: ThemeOverrideContext,
      base?: (props: TemporaryErrorSurfaceProps) => ReactElement,
    ) => ReactElement
    valueChart?: (
      props: ValueChartProps,
      ctx?: ThemeOverrideContext,
      base?: (props: ValueChartProps) => ReactElement,
    ) => ReactElement
    paginated?: (
      props: PaginatedSurfaceProps<unknown>,
      ctx?: ThemeOverrideContext,
      base?: (props: PaginatedSurfaceProps<unknown>) => ReactElement,
    ) => ReactElement
  }
}

const ThemeUiPresentationContext = createContext<
  ThemeUiPresentation | undefined
>(undefined)

export function ThemeUiPresentationProvider(props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement {
  return createElement(
    ThemeUiPresentationContext.Provider,
    { value: props.presentation },
    props.children,
  )
}

export function useThemeUiPresentation(): ThemeUiPresentation | undefined {
  return useContext(ThemeUiPresentationContext)
}
