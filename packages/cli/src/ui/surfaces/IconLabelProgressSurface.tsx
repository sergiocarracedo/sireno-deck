import {
  type HTMLAttributes,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react'

import { EMOJI_RE } from '../../core/icon-source'
import { Icon } from '../primitives/Icon'
import { Label } from '../primitives/Label'
import { useThemeUiPresentation } from '../theme-presentation'

const DEFAULT_VISIBLE_MS = 2000

export interface IconLabelProgressSurfaceProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  source?: string
  label: string
  progress: number
  visible: boolean
  visibleMs?: number
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
    ...rest
  } = props

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

  if (themeUi?.surfaces?.iconLabelProgress) {
    return themeUi.surfaces.iconLabelProgress(props)
  }

  const clampedProgress = Math.max(0, Math.min(100, progress))
  const layoutClassName = 'flex flex-col items-center justify-center gap-1'
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
      data-visible={shown ? 'true' : 'false'}
      data-progress={clampedProgress}
      {...rest}
    >
      {iconContent}
      <Label text={label} />
      {shown && (
        <div
          aria-hidden="true"
          className="block h-1 w-3/4 overflow-hidden rounded-full bg-black/20"
        >
          <div
            className="h-full bg-white transition-all duration-200"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}
