import { createContext, createElement, useContext, type ReactElement } from 'react'

export interface ThemeUiPresentation {
  chip?: (props: { children: React.ReactNode; tone?: string }) => ReactElement
  icon?: (props: unknown) => ReactElement
  text?: (props: unknown) => ReactElement
  label?: (props: { children: React.ReactNode }) => ReactElement
  tapIndicator?: (props: { type?: string; size?: string }) => ReactElement
  surfaces?: {
    iconLabel?: (props: unknown) => ReactElement
    bars?: (props: unknown) => ReactElement
    splitAction?: (props: unknown) => ReactElement
  }
}

const DomThemeUiPresentationContext = createContext<ThemeUiPresentation | undefined>(undefined)
const MountedThemeUiPresentationContext = createContext<ThemeUiPresentation | undefined>(undefined)

export function DomThemeUiPresentationProvider(props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement {
  return createElement(DomThemeUiPresentationContext.Provider, { value: props.presentation }, props.children)
}

export function MountedThemeUiPresentationProvider(props: {
  children: ReactElement
  presentation?: ThemeUiPresentation
}): ReactElement {
  return createElement(MountedThemeUiPresentationContext.Provider, { value: props.presentation }, props.children)
}

export function useThemeUiPresentation(): ThemeUiPresentation | undefined {
  return useContext(MountedThemeUiPresentationContext) ?? useContext(DomThemeUiPresentationContext)
}
