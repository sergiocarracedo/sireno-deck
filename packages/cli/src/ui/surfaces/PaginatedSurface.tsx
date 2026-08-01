import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react"

import { cn } from "../utils/cn"
import { useThemeUiPresentation } from "../theme-presentation"

export interface PaginatedGestureEvent {
  gesture: "tap" | "dbl-tap" | "hold"
  at: number
}

export interface PaginatedPage<T> {
  render: (props: T) => ReactElement
  config: T
}

export interface PaginatedSurfaceProps<T> {
  pages: PaginatedPage<T> | PaginatedPage<T>[]
  gesture?: PaginatedGestureEvent | null
  intervalMs?: number
  autoReturnMs?: number
  className?: string
  style?: CSSProperties
}

function normalizePages<T>(
  pages: PaginatedPage<T> | PaginatedPage<T>[],
): PaginatedPage<T>[] {
  return Array.isArray(pages) ? pages : [pages]
}

const DOT_ACTIVE = "bg-white"
const DOT_INACTIVE = "bg-white/30"

export function PaginatedSurface<T>({
  pages,
  gesture,
  intervalMs,
  autoReturnMs,
  className,
  style,
}: PaginatedSurfaceProps<T>): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.paginated) {
    return themeUi.surfaces.paginated(
      {
        pages,
        gesture,
        intervalMs,
        autoReturnMs,
        className,
        style,
      } as PaginatedSurfaceProps<unknown>,
      undefined,
      paginatedSurfaceBase,
    )
  }

  return paginatedSurfaceBase({
    pages,
    gesture,
    intervalMs,
    autoReturnMs,
    className,
    style,
  } as PaginatedSurfaceProps<T>)
}

export function paginatedSurfaceBase<T>({
  pages,
  gesture,
  intervalMs,
  autoReturnMs,
  className,
  style,
}: PaginatedSurfaceProps<T>): ReactElement {
  const allPages = normalizePages(pages)
  const count = allPages.length
  const [current, setCurrent] = useState(0)
  const lastGestureAt = useRef(0)
  const timerRef = useRef<number | null>(null)
  const autoReturnTimerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearAutoReturnTimer = useCallback(() => {
    if (autoReturnTimerRef.current !== null) {
      window.clearTimeout(autoReturnTimerRef.current)
      autoReturnTimerRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    setCurrent((p) => (p + 1) % count)
  }, [count])

  // gesture-driven cycling
  useEffect(() => {
    if (gesture?.gesture === "tap" && gesture.at !== lastGestureAt.current) {
      lastGestureAt.current = gesture.at
      clearTimer()
      advance()
    }
  }, [gesture, advance, clearTimer])

  // auto-advance timer
  useEffect(() => {
    if (intervalMs === undefined || count <= 1) return
    clearTimer()
    timerRef.current = window.setInterval(advance, intervalMs)
    return clearTimer
  }, [intervalMs, count, advance, clearTimer])

  // auto-return to page 0
  useEffect(() => {
    clearAutoReturnTimer()
    if (autoReturnMs === undefined || current === 0) return
    autoReturnTimerRef.current = window.setTimeout(() => {
      setCurrent(0)
    }, autoReturnMs)
    return clearAutoReturnTimer
  }, [current, autoReturnMs, clearAutoReturnTimer])

  // reset current page when pages array changes length
  useEffect(() => {
    setCurrent((p) => (p >= count ? 0 : p))
  }, [count])

  const page = allPages[current]!

  return (
    <div
      className={cn("relative flex h-full w-full flex-col", className)}
      style={style}
    >
      <div className="min-h-0 flex-1">{page.render(page.config as T)}</div>
      {count > 1 && (
        <div className="absolute bottom-[-4px] left-0 right-0 flex items-center justify-center gap-1">
          {allPages.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 w-1 rounded-full",
                i === current ? DOT_ACTIVE : DOT_INACTIVE,
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
