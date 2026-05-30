import { createElement, type CSSProperties, type ReactElement, type ReactNode } from "react"

import { resolveDomAssetSrc } from "../addon/api.js"
import { cn } from "../themes/utils/cn.js"
import { useThemeUiPresentation } from "./theme-presentation.js"

const GENERIC_ICON_REGISTRY = {
  clock: {
    stroke: true,
    viewBox: "0 0 24 24",
    paths: [
      createElement("circle", { cx: "12", cy: "12", key: "outline", r: "9" }),
      createElement("path", { d: "M12 7v5l3 2", key: "hands" }),
    ],
  },
  sparkles: {
    stroke: true,
    viewBox: "0 0 24 24",
    paths: [
      createElement("path", {
        d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
        key: "burst",
      }),
      createElement("path", {
        d: "M5 4l.6 1.7L7.3 6.3l-1.7.6L5 8.6l-.6-1.7-1.7-.6 1.7-.6L5 4Z",
        key: "spark-a",
      }),
      createElement("path", {
        d: "M18.5 15.5l.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z",
        key: "spark-b",
      }),
    ],
  },
  warning: {
    stroke: true,
    viewBox: "0 0 24 24",
    paths: [
      createElement("path", {
        d: "M12 4.5 20 19H4L12 4.5Z",
        key: "triangle",
      }),
      createElement("path", {
        d: "M12 9.5v4.5",
        key: "stem",
      }),
      createElement("circle", {
        cx: "12",
        cy: "16.75",
        key: "dot",
        r: "0.9",
      }),
    ],
  },
} as const

const BRAND_ICON_REGISTRY = {
  github: {
    stroke: false,
    viewBox: "0 0 24 24",
    paths: [
      createElement("path", {
        d: "M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.05-1.41-4.05-1.41-.55-1.38-1.34-1.75-1.34-1.75-1.1-.75.09-.74.09-.74 1.21.09 1.85 1.24 1.85 1.24 1.08 1.84 2.84 1.31 3.53 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.51.12-3.15 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.85.12 3.15.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.66-5.49 5.96.43.37.81 1.08.81 2.18v3.23c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z",
        key: "github",
      }),
    ],
  },
} as const

const TONE_CLASS = {
  accent: "text-accent",
  danger: "text-danger",
  foreground: "text-foreground",
  primary: "text-primary",
  success: "text-success",
} as const

export type GenericIconName = keyof typeof GENERIC_ICON_REGISTRY
export type BrandIconName = keyof typeof BRAND_ICON_REGISTRY
export type IconTone = keyof typeof TONE_CLASS

interface IconCommonProps {
  className?: string
  label?: string
  size?: number
  style?: CSSProperties
  tone?: IconTone
}

export type IconProps = IconCommonProps & (
  | { brand: BrandIconName; icon?: never; src?: never }
  | { brand?: never; icon: GenericIconName; src?: never }
  | { brand?: never; icon?: never; src: string }
)

function renderSvg(
  props: IconCommonProps,
  definition: { paths: readonly ReactNode[]; stroke: boolean; viewBox: string },
  source: "brand" | "generic",
): ReactElement {
  const size = props.size ?? 20
  const decorative = !props.label

  return createElement(
    "svg",
    {
      "aria-hidden": decorative ? "true" : undefined,
      "aria-label": props.label,
      className: cn(
        "inline-block shrink-0",
        TONE_CLASS[props.tone ?? "foreground"],
        props.className,
      ),
      "data-sireno-icon-source": source,
      "data-sireno-ui-icon": "true",
      fill: definition.stroke ? "none" : "currentColor",
      focusable: "false",
      role: decorative ? undefined : "img",
      stroke: definition.stroke ? "currentColor" : undefined,
      strokeLinecap: definition.stroke ? "round" : undefined,
      strokeLinejoin: definition.stroke ? "round" : undefined,
      strokeWidth: definition.stroke ? 1.8 : undefined,
      style: { height: `${size}px`, width: `${size}px`, ...props.style },
      viewBox: definition.viewBox,
      xmlns: "http://www.w3.org/2000/svg",
    },
    ...definition.paths,
  )
}

export function Icon(props: IconProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if ("src" in props) {
    const size = props.size ?? 20
    const decorative = !props.label

    const element = createElement("img", {
      alt: props.label ?? "",
      "aria-hidden": decorative ? "true" : undefined,
      className: cn("inline-block shrink-0", props.className),
      "data-sireno-icon-source": "asset",
      "data-sireno-ui-icon": "true",
      src: resolveDomAssetSrc(props.src),
      style: {
        height: `${size}px`,
        objectFit: "contain",
        width: `${size}px`,
        ...props.style,
      },
    })

    return themeUi?.icon
      ? themeUi.icon({
          children: element,
          decorative,
          source: "asset",
          tone: props.tone,
        })
      : element
  }

  if ("brand" in props) {
    const element = renderSvg(props, BRAND_ICON_REGISTRY[props.brand], "brand")

    return themeUi?.icon
      ? themeUi.icon({
          children: element,
          decorative: !props.label,
          source: "brand",
          tone: props.tone,
        })
      : element
  }

  const element = renderSvg(props, GENERIC_ICON_REGISTRY[props.icon], "generic")

  return themeUi?.icon
    ? themeUi.icon({
        children: element,
        decorative: !props.label,
        source: "generic",
        tone: props.tone,
      })
    : element
}
