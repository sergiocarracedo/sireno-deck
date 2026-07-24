import { useMemo } from "react"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"
import { Text, TextTone } from "./Text"

export type TapIndicatorType = "tap" | "dbltap" | "hold"

export type TapIndicatorProps = {
  type?: TapIndicatorType
  size?: "xs" | "sm" | "md"
}

export const TapIndicator = (props: TapIndicatorProps) => {
  const tapType = props.type || "tap"
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.tapIndicator) {
    return themeUi.primitives.tapIndicator(props)
  }

  const label = useMemo(() => {
    const labelMap: Record<NonNullable<TapIndicatorType>, string> = {
      tap: "TAP",
      dbltap: "DBL",
      hold: "HOLD",
    }

    return labelMap[tapType]
  }, [tapType])

  const themeTypes: Record<
    TapIndicatorType,
    { textTone: TextTone; bg: string; border?: string }
  > = {
    tap: {
      textTone: "foreground",
      bg: "bg-frame",
      border: "border-frame",
    },
    dbltap: {
      textTone: "foreground-contrast",
      bg: "bg-accent",
    },
    hold: {
      textTone: "foreground-contrast",
      bg: "bg-primary",
    },
  }

  const themeType = themeTypes[tapType]

  return (
    <span
      className={cn([
        "inline-block px-1 rounded-sm",
        themeType.bg,
        themeType.border && "border border-solid",
        themeType.border,
      ])}
    >
      <Text size={props.size} tone={themeType.textTone} text={label} />
    </span>
  )
}
