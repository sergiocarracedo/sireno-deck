import type { CSSProperties, ReactElement } from "react"

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
      <div className="flex-1 flex items-center justify-center gap-1.5 min-h-0">
        {item.icon ? <Icon source={item.icon} size={14} /> : null}
        <span
          className="font-mono text-lg font-bold leading-none truncate"
          style={{ minWidth: 0 }}
        >
          {item.value}
        </span>
      </div>
      {showLabel ? (
        <div
          className={cn(
            "flex items-center justify-center gap-1 truncate",
            "opacity-75 uppercase tracking-wide text-[9px] font-bold",
          )}
        >
          <span className="truncate">{item.label}</span>
          {item.units ? <span>{item.units}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export function LabelValueList(props: LabelValueListProps): ReactElement {
  if (props.lines.length < 1 || props.lines.length > 3) {
    throw new Error(
      `LabelValueList supports 1-3 lines. Received ${props.lines.length}.`,
    )
  }

  const themeUi = useThemeUiPresentation()
  if (themeUi?.surfaces?.labelValueList) {
    return themeUi.surfaces.labelValueList(props)
  }

  // ponytail: 1-2 metrics render as stacked 2-row tiles (icon+value over
  // label+units); 3 metrics collapse to icon-only rows because there isn't
  // room without truncation.
  const showLabel = props.lines.length <= 2
  const tile = (item: LabelValueListLine, key: string) => (
    <RowTile key={key} item={item} showLabel={showLabel} />
  )

  return (
    <div
      className={cn(
        "flex w-full gap-1 p-1 items-stretch",
        showLabel ? "flex-col h-full" : "flex-row flex-wrap",
        props.className,
      )}
      style={{ color: "var(--sireno-color-fg)", ...props.style }}
    >
      {props.lines.map((item, index) =>
        showLabel ? (
          tile(item, `${item.label}-${index}`)
        ) : (
          <div
            key={`${item.label}-${index}`}
            className="min-h-[28px] flex-1 flex basis-1/2"
          >
            {tile(item, `${item.label}-${index}`)}
          </div>
        ),
      )}
    </div>
  )
}
