import { type ReactElement } from "react"

import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"
import { Text, type TextFit, TextSize, TextWeight } from "./Text"

export const labelVariants = ["primary", "secondary", "small", "xxs"] as const
export type LabelVariant = (typeof labelVariants)[number]

export type LabelFit = "ellipsis" | "autofit"

const VARIANT_AUTOFIT_MIN_PX: Record<LabelVariant, number> = {
  primary: 10,
  secondary: 8,
  small: 8,
  xxs: 6,
}

export interface LabelProps {
  text: string
  lines?: 1 | 2 | 3
  variant?: LabelVariant
  fit?: LabelFit
}

export function Label(props: LabelProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.label) {
    return themeUi.primitives.label(props)
  }

  const variantsStyle: Record<
    LabelVariant,
    {
      size: TextSize
      className?: string
      weight: TextWeight
    }
  > = {
    primary: {
      size: "md",
      className: "uppercase",
      weight: "bold",
    },
    secondary: {
      size: "sm",
      className: "uppercase",
      weight: "bold",
    },
    small: {
      size: "xs",
      weight: "bold",
    },
    xxs: {
      size: "xxs",
      weight: "bold",
    },
  }

  const variantStyle = variantsStyle[props.variant ?? "primary"]
  const fitMode = props.fit ?? "ellipsis"
  const lines = props.lines || 1

  const fit: TextFit =
    fitMode === "autofit"
      ? {
          type: "autofit",
          minSize: VARIANT_AUTOFIT_MIN_PX[props.variant ?? "primary"],
          lines,
        }
      : { type: "ellipsis", lines, reserveSpace: false }

  return (
    <Text
      data-sireno-ui-label="true"
      size={variantStyle.size}
      className={cn(
        "tracking-tight max-w-full wrap-anywhere",
        variantStyle.className,
      )}
      lineHeight={1.25}
      fit={fit}
      tone="primary"
      typography="main"
      text={props.text}
      weight={variantStyle.weight}
    />
  )
}
