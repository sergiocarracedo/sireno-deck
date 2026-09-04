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
  unitLong?: string
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
      valueLineClass?: string
      valueTone?: "foreground" | "primary"
      valueWidthUnits?: TextSize
      valueMultiline?: boolean
      unit: TextSize
      labelSize?: TextSize
      showLabel?: boolean
      multiline?: boolean
      iconSize?: number
      titleClass?: string
      unitsClass?: string
      unitsPosition?: "prev" | "next"
    }
  > = {
    big: {
      value: "5xl",
      valueWidthUnits: "4xl",
      valueMultiline: true,
      unitsClass: "-mt-1 text-center",
      unit: "md",
      showLabel: true,
      multiline: true,
      iconSize: 18,
      titleClass: "items-center justify-center",
      labelSize: "md",
    },
    default: {
      value: "xl",
      unit: "sm",
      multiline: true,
      unitsPosition: "prev",
      iconSize: 16,
      labelSize: "sm",
      showLabel: true,
      valueLineClass: "flex -mt-1",
    },
    small: {
      value: "lg",
      unit: "xs",
      iconSize: 14,
      showLabel: false,
      unitsClass: "max-w-[20%]",
      valueLineClass: "flex",
    },
  }

  const colorStyle = item.color ? { color: item.color } : undefined
  const variantProps = variantsProps[variant]

  return (
    <div
      className={cn(!variantProps.multiline && "flex", "items-start")}
      style={{ ...colorStyle }}
    >
      <div className={cn("flex gap-1 items-center", variantProps.titleClass)}>
        {item.icon ? (
          <Icon source={item.icon} size={variantProps.iconSize} />
        ) : null}
        {variantProps.showLabel ? (
          <Text
            text={item.label}
            size={variantProps.labelSize ?? "xs"}
            weight="semibold"
            tone="foreground"
            fit="autofit"
          />
        ) : null}
        {variantProps.unitsPosition === "prev" && item.units ? (
          <div className={cn(variantProps.unitsClass)}>
            <Text
              size={variantProps.unit}
              text={item.units}
              style={colorStyle}
            />
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "flex-1 flex min-w-0 min-h-0 gap-0.5 justify-end items-baseline",
          variantProps.valueMultiline ? "flex-col items-center" : "",
          variantProps.valueLineClass,
        )}
      >
        <Text
          size={
            item.units
              ? (variantProps.valueWidthUnits ?? variantProps.value)
              : variantProps.value
          }
          weight={variant === "big" ? "normal" : "bold"}
          text={item.value}
          tone={variantProps.valueTone ?? "primary"}
          style={colorStyle}
          fit="autofit"
        />

        {item.units && variantProps.unitsPosition !== "prev" ? (
          <div className={cn("shrink-0", variantProps.unitsClass)}>
            <Text
              size={variantProps.unit}
              text={
                variant === "big" ? (item.unitLong ?? item.units) : item.units
              }
            />
          </div>
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
    return themeUi.surfaces.labelValueList(
      props,
      undefined,
      labelValueListSurfaceBase,
    )
  }

  return labelValueListSurfaceBase(props)
}

export function labelValueListSurfaceBase(
  props: LabelValueListProps,
): ReactElement {
  if (props.lines.length < 1 || props.lines.length > 3) {
    throw new Error(
      `LabelValueList supports 1-3 lines. Received ${props.lines.length}.`,
    )
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
