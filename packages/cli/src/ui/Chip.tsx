import { createElement, type CSSProperties, type ReactElement, type ReactNode } from "react"

import { cn } from "../themes/utils/cn.js"
import { useThemeUiPresentation } from "./theme-presentation.js"

const TONE_CLASS = {
  accent: "border-accent text-accent",
  danger: "border-danger text-danger",
  foreground: "border-foreground text-foreground",
  primary: "border-primary text-primary",
  success: "border-success text-success",
} as const

export type ChipTone = keyof typeof TONE_CLASS

export interface ChipProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  tone?: ChipTone
}

export function Chip(props: ChipProps): ReactElement {
  const tone = props.tone ?? "foreground"
  const themeUi = useThemeUiPresentation()

  const element = createElement(
    "span",
    {
      className: cn(
        "inline-flex items-center justify-center rounded-full border px-2 py-0.5 uppercase tracking-wide",
        TONE_CLASS[tone],
        props.className,
      ),
      "data-sireno-ui-chip": "true",
      style: {
        fontFamily: "var(--sireno-font-aux-family)",
        fontSize: "calc(var(--sireno-font-aux-size, 16px) * 0.875)",
        fontWeight: "var(--sireno-font-aux-weight)",
        letterSpacing: "var(--sireno-font-aux-tracking)",
        ...props.style,
      },
    },
    props.children,
  )

  return themeUi?.chip ? themeUi.chip({ children: element, tone }) : element
}
