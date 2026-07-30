import { type HTMLAttributes, type ReactElement } from "react"

import { Icon } from "../primitives/Icon"
import { Label } from "../primitives/Label"
import { useThemeUiPresentation } from "../theme-presentation"

export interface TemporaryErrorSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  source?: string
  label?: string
  details: string
}

const FALLBACK_LABEL = "Error"
const FALLBACK_DETAILS = "check logs"

export function TemporaryErrorSurface(
  props: TemporaryErrorSurfaceProps,
): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.temporaryError) {
    return themeUi.surfaces.temporaryError(props)
  }

  const {
    className: consumerClassName,
    source,
    label: labelProp,
    details: detailsProp,
    ...rest
  } = props
  const layoutClassName =
    "flex h-full w-full flex-col items-center justify-center gap-1"
  const mergedClassName = consumerClassName
    ? `${layoutClassName} ${consumerClassName}`
    : layoutClassName

  const label = labelProp ?? FALLBACK_LABEL
  const details =
    (detailsProp ?? "").length > 0 ? detailsProp : FALLBACK_DETAILS

  return (
    <div
      className={mergedClassName}
      data-sireno-surface="temporary-error"
      {...rest}
    >
      <div className="flex items-center justify-center gap-1">
        <Icon source={source} size={16} tone="danger" />
        <Label text={label} variant="secondary" />
      </div>
      <Label text={details} variant="small" lines={3} />
    </div>
  )
}
