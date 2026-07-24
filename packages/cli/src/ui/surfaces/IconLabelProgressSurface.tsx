import {
  type HTMLAttributes,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"

import { EMOJI_RE } from "../../core/icon-source"
import { Icon } from "../primitives/Icon"
import { Label, LabelVariant } from "../primitives/Label"
import { ProgressBar } from "../primitives/ProgressBar"
import { useThemeUiPresentation } from "../theme-presentation"

const DEFAULT_VISIBLE_MS = 2000

export interface IconLabelProgressSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  source?: string
  label: string
  progress: number
  visible: boolean
  visibleMs?: number
  variant?: LabelVariant
  details?: string
  bgColor?: string
  bgColorAlt?: string
}

export function IconLabelProgressSurface(
  props: IconLabelProgressSurfaceProps,
): ReactElement {
  const themeUi = useThemeUiPresentation()
  const {
    className: consumerClassName,
    source,
    label,
    progress,
    visible,
    visibleMs = DEFAULT_VISIBLE_MS,
    variant,
    details,
    bgColor,
    bgColorAlt,
    ...rest
  } = props

  if (themeUi?.surfaces?.iconLabelProgress) {
    return themeUi.surfaces.iconLabelProgress(props)
  }

  const [shown, setShown] = useState(visible)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (visible) {
      setShown(true)
      timerRef.current = setTimeout(() => {
        setShown(false)
        timerRef.current = null
      }, visibleMs)
    } else {
      setShown(false)
    }
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [visible, visibleMs, progress])

  const clampedProgress = Math.max(0, Math.min(100, progress))
  const layoutClassName =
    "flex h-full w-full flex-col items-center justify-center gap-1 relative"
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
    <div
      className={mergedClassName}
      data-sireno-surface="icon-label-progress"
      data-visible={shown ? "true" : "false"}
      data-progress={clampedProgress}
      {...rest}
    >
      {iconContent}
      <Label text={label} variant={variant} />
      {details !== undefined && details.length > 0 && (
        <Label text={details} variant="small" />
      )}
      {shown && (
        <div className="absolute bottom-0 left-0 right-0 px-1 pb-1">
          <ProgressBar
            value={clampedProgress}
            bgColor={bgColor}
            bgColorAlt={bgColorAlt}
          />
        </div>
      )}
    </div>
  )
}
