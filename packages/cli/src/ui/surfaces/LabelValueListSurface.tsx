import type { CSSProperties, ReactElement } from "react"

import { Text, TextSize } from "../primitives"
import { Icon } from "../primitives/Icon"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

export interface LabelValueListLine {
  color?: string
  icon?: string
  label: string
  units?: string
  value: string
}

type LabelValueListLines =
  | readonly [LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine, LabelValueListLine]

export interface LabelValueListProps {
  className?: string
  lines: LabelValueListLines
  style?: CSSProperties
}

type RowTileProps = {
  item: LabelValueListLine
  variant?: "default" | "big" | "small"
}

function RowTile({ item, variant = "default" }: RowTileProps): ReactElement {
  const variantsProps: Record<
    NonNullable<RowTileProps["variant"]>,
    {
      value: TextSize
      unit: TextSize
      labelSize?: TextSize
      showLabel?: boolean
      multiline?: boolean
      iconSize?: number
      titleClass?: string
    }
  > = {
    big: {
      value: "5xl",
      unit: "md",
      showLabel: true,
      multiline: true,
      iconSize: 23,
      titleClass: "items-center justify-center",
      labelSize: "md",
    },
    default: {
      value: "3xl",
      unit: "sm",
      iconSize: 16,
      labelSize: "sm",
    },
    small: {
      value: "lg",
      unit: "xs",
      iconSize: 14,
    },
  }

  const colorStyle = item.color ? { color: item.color } : undefined
  const variantProps = variantsProps[variant]
  return (
    <div
      className={cn(!variantProps.multiline && "flex", "items-start")}
      style={{ ...colorStyle }}
    >
      <div
        className={cn("flex mt-1 gap-1 items-center", variantProps.titleClass)}
      >
        {item.icon ? (
          <Icon source={item.icon} size={variantProps.iconSize} />
        ) : null}
        {variantProps.showLabel ? (
          <Text
            text={item.label}
            size={variantProps.labelSize ?? "xs"}
            weight="semibold"
            tone="primary"
          />
        ) : null}
      </div>
      <div className="flex-1 flex min-h-0 gap-0.5 justify-end items-baseline">
        <Text
          size={variantProps.value}
          weight="bold"
          text={item.value}
          tone="primary"
          style={colorStyle}
          fit="autofit"
        />

        {item.units ? (
          <Text size={variantProps.unit} text={item.units} />
        ) : null}
      </div>
    </div>
  )
}

export function LabelValueListSurface(
  props: LabelValueListProps,
): ReactElement {
  if (props.lines.length < 1 || props.lines.length > 3) {
    throw new Error(
      `LabelValueList supports 1-3 lines. Received ${props.lines.length}.`,
    )
  }

  const themeUi = useThemeUiPresentation()
  if (themeUi?.surfaces?.labelValueList) {
    return themeUi.surfaces.labelValueList(props)
  }

  const variants: Record<number, RowTileProps["variant"]> = {
    1: "big",
    2: "default",
    3: "small",
  }

  const variant =
    variants[Math.min(props.lines.length, Object.values(variants).length)]
  return (
    <div
      className={cn("flex w-full gap-0.5 p-1", "flex-col", props.className)}
      style={{
        color: "var(--sireno-color-fg)",
        ...props.style,
      }}
    >
      {props.lines.map((item, index) => (
        <RowTile key={`${item.label}-${index}`} item={item} variant={variant} />
      ))}
    </div>
  )
}
