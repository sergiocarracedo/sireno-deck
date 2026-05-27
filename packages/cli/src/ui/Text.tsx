import { createElement, type CSSProperties, type ReactElement, type ReactNode } from "react"

import { cn } from "../themes/utils/cn.js"

const ALIGN_CLASS = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
} as const

const TONE_CLASS = {
  accent: "text-accent",
  danger: "text-danger",
  foreground: "text-foreground",
  primary: "text-primary",
  success: "text-success",
} as const

const TYPOGRAPHY_CLASS = {
  aux: "font-aux",
  main: "font-main",
  mono: "font-mono",
} as const

export type TextAlign = keyof typeof ALIGN_CLASS
export type TextFit = "ellipsis" | "marquee" | "shrink" | "wrap"
export type TextTone = keyof typeof TONE_CLASS
export type TextTypography = keyof typeof TYPOGRAPHY_CLASS

export interface TextProps {
  align?: TextAlign
  children: ReactNode
  className?: string
  fit?: TextFit
  style?: CSSProperties
  tone?: TextTone
  typography?: TextTypography
}

export function Text(props: TextProps): ReactElement {
  const fit = props.fit ?? "wrap"

  return createElement(
    "span",
    {
      className: cn(
        "block max-w-full min-w-0 leading-tight",
        TYPOGRAPHY_CLASS[props.typography ?? "main"],
        TONE_CLASS[props.tone ?? "foreground"],
        ALIGN_CLASS[props.align ?? "center"],
        fit === "wrap" && "whitespace-normal break-words",
        fit === "ellipsis" && "overflow-hidden whitespace-nowrap text-ellipsis",
        fit === "shrink" && "sireno-text-fit-shrink whitespace-normal break-words",
        fit === "marquee" && "sireno-text-fit-marquee overflow-hidden whitespace-nowrap",
        props.className,
      ),
      "data-sireno-text-fit": fit,
      "data-sireno-ui-text": "true",
      style: props.style,
    },
    fit === "marquee"
      ? createElement(
          "span",
          { className: "sireno-marquee-track inline-block" },
          props.children,
        )
      : props.children,
  )
}
