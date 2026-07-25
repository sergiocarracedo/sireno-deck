import type { CSSProperties, ReactElement } from "react"

import { Text } from "../primitives"
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

function RowTile({
  item,
  showLabel,
}: {
  item: LabelValueListLine
  showLabel: boolean
}): ReactElement {
  const colorStyle = item.color ? { color: item.color } : undefined
  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col text-center overflow-hidden"
      style={colorStyle}
    >
      <div className="flex-1 flex items-center gap-1.5 min-h-0">
        {item.icon ? <Icon source={item.icon} size={14} /> : null}
        <div className="flex-1"></div>
        <div className="flex-1 flex items-center min-h-0">
          <Text size="lg" weight="bold" text={item.value} tone="primary"></Text>

          {item.units ? (
            <Text size="xs" weight="bold" text={item.units}></Text>
          ) : null}
        </div>
      </div>
      {showLabel ? (
        <div className={cn("flex items-center justify-center gap-1")}>
          <Text text={item.label} size="xs"></Text>
          {item.units ? (
            <Text text={item.units} size="xs"></Text>
          ) : null}
        </div>
      ) : null}
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

  const showLabel = props.lines.length <= 2

  if (props.lines.length === 1) {
    return (
      <div
        className={cn(props.className)}
        style={{ color: "var(--sireno-color-fg)", ...props.style }}
      >
        {props.lines.map((item, index) => (
          <RowTile
            key={`${item.label}-${index}`}
            item={item}
            showLabel={showLabel}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex w-full gap-1 p-1",
        showLabel ? "flex-col h-full" : "flex-row flex-wrap",
        props.className,
      )}
      style={{ color: "var(--sireno-color-fg)", ...props.style }}
    >
      {props.lines.map((item, index) =>
        showLabel ? (
          <RowTile
            key={`${item.label}-${index}`}
            item={item}
            showLabel={showLabel}
          />
        ) : (
          <div
            key={`${item.label}-${index}`}
            className="min-h-[28px] flex-1 flex basis-1/2"
          >
            <RowTile
              key={`${item.label}-${index}`}
              item={item}
              showLabel={false}
            />
          </div>
        ),
      )}
    </div>
  )
}
