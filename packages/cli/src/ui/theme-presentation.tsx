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

export interface ThemeUiPresentation {
  buttonFrame?: (props: ButtonFrameProps) => ReactElement
  primitives?: {
    chip?: (props: ChipProps) => ReactElement
    icon?: (props: IconProps) => ReactElement
    text?: (props: TextProps) => ReactElement
    label?: (props: LabelProps) => ReactElement
    tapIndicator?: (props: TapIndicatorProps) => ReactElement
  }
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
