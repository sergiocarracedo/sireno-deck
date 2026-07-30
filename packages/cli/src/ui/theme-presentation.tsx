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
  TapIndicatorProps,
  TextProps,
} from "./primitives"
import {
  BarsProps,
  IconLabelProgressSurfaceProps,
  IconLabelSurfaceProps,
  LabelValueListProps,
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
  ) => ReactElement
  primitives?: {
    chip?: (props: ChipProps, ctx?: ThemeOverrideContext) => ReactElement
    icon?: (props: IconProps, ctx?: ThemeOverrideContext) => ReactElement
    text?: (props: TextProps, ctx?: ThemeOverrideContext) => ReactElement
    label?: (props: LabelProps, ctx?: ThemeOverrideContext) => ReactElement
    tapIndicator?: (
      props: TapIndicatorProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
  }
  surfaces?: {
    iconLabel?: (
      props: IconLabelSurfaceProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
    iconLabelProgress?: (
      props: IconLabelProgressSurfaceProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
    bars?: (props: BarsProps, ctx?: ThemeOverrideContext) => ReactElement
    splitAction?: (
      props: SplitActionSurfaceProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
    labelValueList?: (
      props: LabelValueListProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
    temporaryError?: (
      props: TemporaryErrorSurfaceProps,
      ctx?: ThemeOverrideContext,
    ) => ReactElement
    valueChart?: (
      props: ValueChartProps,
      ctx?: ThemeOverrideContext,
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
