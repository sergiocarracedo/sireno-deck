import { createElement, type CSSProperties, type ReactElement, type ReactNode } from "react"

import { cn } from "../themes/utils/cn.js"

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
  return createElement(
    "span",
    {
      className: cn(
        "inline-flex items-center justify-center rounded-full border px-2 py-0.5 font-aux uppercase tracking-wide",
        TONE_CLASS[props.tone ?? "foreground"],
        props.className,
      ),
      "data-sireno-ui-chip": "true",
      style: props.style,
    },
    props.children,
  )
}
