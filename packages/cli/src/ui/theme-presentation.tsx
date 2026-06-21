import {
  createContext,
  createElement,
  useContext,
  type ReactElement,
} from 'react'

import type { ThemeUiPresentation } from '@/config/theme/schemas'

const DomThemeUiPresentationContext = createContext<
  ThemeUiPresentation | undefined
>(undefined)
const MountedThemeUiPresentationContext = createContext<
  ThemeUiPresentation | undefined
>(undefined)

export function DomThemeUiPresentationProvider(props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement {
  return createElement(
    DomThemeUiPresentationContext.Provider,
    { value: props.presentation },
    props.children,
  )
}

export function MountedThemeUiPresentationProvider(props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement {
  return createElement(
    MountedThemeUiPresentationContext.Provider,
    { value: props.presentation },
    props.children,
  )
}

export function useThemeUiPresentation(): ThemeUiPresentation | undefined {
  return (
    useContext(MountedThemeUiPresentationContext) ??
    useContext(DomThemeUiPresentationContext)
  )
}
