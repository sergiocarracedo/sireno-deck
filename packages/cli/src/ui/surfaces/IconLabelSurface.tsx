import { type HTMLAttributes, type ReactElement } from "react"

import { EMOJI_RE } from "../../core/icon-source"
import { Icon } from "../primitives/Icon"
import { Label, LabelVariant } from "../primitives/Label"
import { useThemeUiPresentation } from "../theme-presentation"

export interface IconLabelSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  source?: string
  label: string
  variant?: LabelVariant
  details?: string
}

export function IconLabelSurface(props: IconLabelSurfaceProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.iconLabel) {
    return themeUi.surfaces.iconLabel(props)
  }

  const { className: consumerClassName, source, ...rest } = props
  const layoutClassName = "flex flex-col items-center justify-center gap-1"
  const mergedClassName = consumerClassName
    ? `${layoutClassName} ${consumerClassName}`
    : layoutClassName

  const iconContent =
    source !== undefined && EMOJI_RE.test(source) ? (
      <span
        className="inline-block shrink-0 leading-none"
        style={{ fontSize: 36 }}
      >
        {source}
      </span>
    ) : (
      <Icon source={source} size={36} />
    )

  return (
    <div className={mergedClassName} {...rest}>
      {iconContent}
      <Label text={props.label} variant={props.variant} lines={2} fit="autofit" />
      {props.details !== undefined && props.details.length > 0 && (
        <Label text={props.details} variant="small" fit="autofit" />
      )}
    </div>
  )
}
