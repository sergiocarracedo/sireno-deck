import {
  createElement,
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"

import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

const ALIGN_CLASS = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
} as const

const TONE_CLASS = {
  accent: "text-accent",
  danger: "text-danger",
  fg: "text-fg",
  foreground: "text-fg",
  "foreground-contrast": "text-foreground-contrast",
  primary: "text-primary",
  success: "text-success",
  muted: "text-muted",
} as const

const TYPOGRAPHY_CLASS = {
  aux: "font-aux",
  main: "font-main",
  mono: "font-mono",
} as const

const TEXT_WEIGHT = [
  "normal",
  "semibold",
  "bold",
  "light",
  "thin",
  "extralight",
  "black",
] as const

const WEIGHT_CLASS = {
  normal: "font-normal",
  semibold: "font-semibold",
  bold: "font-bold",
  light: "font-light",
  thin: "font-thin",
  extralight: "font-extralight",
  black: "font-black",
} as const

const SIZE_CLASS = {
  xxs: "text-[8px]",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
} as const

const RICH_TONE_TAGS = [
  "accent",
  "danger",
  "foreground",
  "primary",
  "success",
] as const

const RICH_SIZE_TAGS = [
  "xxs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const

type RichToneTag = (typeof RICH_TONE_TAGS)[number]
type RichSizeTag = (typeof RICH_SIZE_TAGS)[number]
type RichMarkupTag =
  | "blink"
  | "dim"
  | "highlight"
  | "strong"
  | RichToneTag
  | RichSizeTag

type RichTextNode =
  | { type: "line-break" }
  | { type: "nbsp" }
  | {
      type: "tag"
      tag: string
      extraClasses?: string[]
      children: RichTextNode[]
    }
  | { type: "text"; value: string }

type ParseStop =
  | { kind: "highlight" }
  | { kind: "tag"; tag: Exclude<RichMarkupTag, "highlight"> }

const RICH_TAG_NAMES = new Set<string>([
  ...RICH_TONE_TAGS,
  ...RICH_SIZE_TAGS,
  "blink",
  "dim",
  "strong",
])

function isRichToneTag(tag: string): tag is RichToneTag {
  return RICH_TONE_TAGS.includes(tag as RichToneTag)
}

function isRichSizeTag(tag: string): tag is RichSizeTag {
  return RICH_SIZE_TAGS.includes(tag as RichSizeTag)
}

function parseRichText(input: string): RichTextNode[] | null {
  let index = 0

  function parseSequence(stop?: ParseStop): RichTextNode[] | null {
    const nodes: RichTextNode[] = []
    let textStart = index

    const flushText = () => {
      if (textStart < index) {
        nodes.push({ type: "text", value: input.slice(textStart, index) })
      }
    }

    while (index < input.length) {
      if (stop?.kind === "highlight" && input[index] === "*") {
        flushText()
        index += 1
        return nodes
      }

      if (stop?.kind === "tag" && input.startsWith(`</${stop.tag}>`, index)) {
        flushText()
        index += stop.tag.length + 3
        return nodes
      }

      const current = input[index]

      if (current === "|") {
        flushText()
        nodes.push({ type: "line-break" })
        index += 1
        textStart = index
        continue
      }

      if (current === "&" && input.slice(index, index + 6) === "&nbsp;") {
        flushText()
        nodes.push({ type: "nbsp" })
        index += 6
        textStart = index
        continue
      }

      if (current === "*") {
        flushText()
        index += 1
        textStart = index
        const children = parseSequence({ kind: "highlight" })
        if (children === null) {
          return null
        }
        nodes.push({ type: "tag", tag: "highlight", children })
        textStart = index
        continue
      }

      if (current === "<") {
        if (input.startsWith("</", index)) {
          return null
        }

        const closeIndex = input.indexOf(">", index + 1)
        if (closeIndex === -1) {
          return null
        }

        const tagName = input.slice(index + 1, closeIndex)
        const [baseTag, ...rest] = tagName.split(/\s+/)
        if (!baseTag || !RICH_TAG_NAMES.has(baseTag)) {
          return null
        }

        flushText()
        index = closeIndex + 1
        textStart = index

        const children = parseSequence({
          kind: "tag",
          tag: baseTag as Exclude<RichMarkupTag, "highlight">,
        })
        if (children === null) {
          return null
        }

        nodes.push({
          type: "tag",
          tag: baseTag,
          extraClasses: rest.length > 0 ? rest : undefined,
          children,
        })
        textStart = index
        continue
      }

      index += 1
    }

    flushText()
    return stop ? null : nodes
  }

  return parseSequence()
}

function isPlainTextTree(nodes: RichTextNode[]): boolean {
  return nodes.every((node) => node.type === "text")
}

function renderRichTextNodes(
  nodes: RichTextNode[],
  keyPrefix: string,
  className?: string,
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.type === "text") {
      return node.value
    }

    if (node.type === "line-break") {
      return createElement("span", {
        className: "sireno-rich-text-break",
        "data-sireno-rich-text-tag": "line-break",
        key,
      })
    }

    if (node.type === "nbsp") {
      return createElement("span", { key, "aria-hidden": "true" }, "\u00A0")
    }

    const classNames = ["sireno-rich-text-node", className]

    if (node.tag === "blink") {
      classNames.push("sireno-rich-text-blink")
    }

    if (node.tag === "dim") {
      classNames.push("opacity-50")
    }

    if (node.tag === "strong" || node.tag === "highlight") {
      classNames.push("sireno-rich-text-strong")
    }

    if (node.tag === "highlight") {
      classNames.push(TONE_CLASS.primary)
    } else if (isRichToneTag(node.tag)) {
      classNames.push(TONE_CLASS[node.tag])
    } else if (isRichSizeTag(node.tag)) {
      classNames.push(SIZE_CLASS[node.tag])
    }

    if (node.extraClasses) {
      classNames.push(...node.extraClasses)
    }

    return (
      <span
        className={cn(classNames)}
        data-sireno-rich-text-tag={node.tag}
        key={key}
      >
        {renderRichTextNodes(node.children, key, className)}
      </span>
    )
  })
}

function renderTextChildren(
  children: ReactNode,
  _lineHeight: number | string,
): ReactNode {
  if (typeof children !== "string") {
    return children
  }

  const parsed = parseRichText(children)
  if (parsed === null || isPlainTextTree(parsed)) {
    return children
  }

  return renderRichTextNodes(parsed, "rich", "!leading-[inherit]")
}

export type TextAlign = keyof typeof ALIGN_CLASS

export type TextFitType = "ellipsis" | "shrink" | "hidden" | "autofit"

export type TextFit = {
  type: TextFitType
  lines?: 1 | 2 | 3
  reserveSpace?: boolean
  minSize?: number
}

export type ResolvedTextFit = {
  type: TextFitType
  lines: 1 | 2 | 3
  reserveSpace: boolean
  minSize?: number
}

export type TextTone = keyof typeof TONE_CLASS
export type TextTypography = keyof typeof TYPOGRAPHY_CLASS
export type TextSize = keyof typeof SIZE_CLASS
export type TextWeight = (typeof TEXT_WEIGHT)[number]

const MIN_LINE_CLAMP = 1
const MAX_LINE_CLAMP = 3

function clampLines(lines: number | undefined): 1 | 2 | 3 {
  const raw = Math.floor(lines || 1)
  return Math.max(MIN_LINE_CLAMP, Math.min(MAX_LINE_CLAMP, raw)) as 1 | 2 | 3
}

export function resolveTextFit(
  fit: TextFit | TextFitType | undefined,
): ResolvedTextFit {
  if (fit === undefined || typeof fit === "string") {
    return {
      type: fit ?? "hidden",
      reserveSpace: false,
      lines: 1,
    }
  }

  if (fit.type === "autofit") {
    if (typeof fit.minSize !== "number" || !Number.isFinite(fit.minSize)) {
      throw new Error(
        "Text: autofit fit requires a numeric `minSize` (px floor).",
      )
    }
    return {
      type: "autofit",
      lines: clampLines(fit.lines),
      reserveSpace: false,
      minSize: fit.minSize,
    }
  }

  return {
    type: fit.type,
    lines: clampLines(fit.lines),
    reserveSpace: fit.reserveSpace ?? false,
  }
}

type AutofitState = "fit" | "ellipsis"

function useAutofit(
  ref: RefObject<HTMLDivElement | null>,
  minSize: number,
  text: string,
  lines: number,
): { fontSize: number | null; state: AutofitState; effectiveLines: number } {
  const [fontSize, setFontSize] = useState<number | null>(null)
  const [state, setState] = useState<AutofitState>("fit")
  const [effectiveLines, setEffectiveLines] = useState(lines)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (minSize <= 0) return

    const STEP = 1
    const ONE_LINE_REDUCE_LIMIT = 3
    let pending: number | null = null

    const schedule = () => {
      if (pending !== null) return
      pending = requestAnimationFrame(() => {
        pending = null
        measure()
      })
    }

    const measure = () => {
      const computed = parseFloat(getComputedStyle(el).fontSize)
      if (!Number.isFinite(computed) || computed <= 0) return

      const restoreInline = () => {
        el.style.fontSize = ""
        el.style.whiteSpace = ""
        el.style.display = ""
        ;(el.style as CSSProperties & Record<string, string>)[
          "WebkitLineClamp"
        ] = ""
      }

      const measureTextWidth = () => {
        const prevOverflow = el.style.overflow
        const prevTextOverflow = el.style.textOverflow
        el.style.overflow = "visible"
        el.style.textOverflow = ""
        el.style.whiteSpace = "nowrap"
        const w = el.scrollWidth
        el.style.overflow = prevOverflow
        el.style.textOverflow = prevTextOverflow
        return w
      }
      const measureTextHeight = () => {
        el.style.whiteSpace = ""
        return el.scrollHeight
      }
      const containerWidth = () => el.clientWidth

      if (lines > 1) {
        // Phase 1: natural 1-line check
        restoreInline()
        const containerW = containerWidth()
        if (measureTextWidth() <= containerW + 1) {
          restoreInline()
          setFontSize(null)
          setState("fit")
          setEffectiveLines(1)
          return
        }

        // Phase 2: reduce 1-line, capped at natural - ONE_LINE_REDUCE_LIMIT
        const oneLineFloor = Math.max(
          minSize,
          Math.floor(computed) - ONE_LINE_REDUCE_LIMIT,
        )
        let size = Math.floor(computed) - STEP
        for (; size >= oneLineFloor; size -= STEP) {
          el.style.fontSize = `${size}px`
          if (measureTextWidth() <= containerW + 1) {
            restoreInline()
            setFontSize(size)
            setState("fit")
            setEffectiveLines(1)
            return
          }
        }

        // Phase 3: reset to natural, try multi-line at natural
        restoreInline()
        el.style.fontSize = ""
        const naturalMultiHeight = measureTextHeight()
        const naturalLineEm =
          parseFloat(getComputedStyle(el).lineHeight) || computed * 1.2
        if (naturalMultiHeight <= lines * naturalLineEm + 1) {
          restoreInline()
          setFontSize(null)
          setState("fit")
          setEffectiveLines(lines)
          return
        }

        // Phase 4: reduce for multi-line, down to minSize
        const multiStart = Math.floor(computed) - STEP
        for (let s = multiStart; s >= minSize; s -= STEP) {
          el.style.fontSize = `${s}px`
          const sh = measureTextHeight()
          const lh = parseFloat(getComputedStyle(el).lineHeight) || s * 1.2
          if (sh <= lines * lh + 1) {
            restoreInline()
            setFontSize(s)
            setState("fit")
            setEffectiveLines(lines)
            return
          }
        }

        // Phase 5: nothing fit, ellipsis at minSize
        restoreInline()
        setFontSize(minSize)
        setState("ellipsis")
        setEffectiveLines(lines)
        return
      }

      // lines === 1: binary search between natural and minSize
      const hi = Math.max(minSize, Math.round(computed))

      el.style.fontSize = `${hi}px`
      if (
        el.scrollWidth <= el.clientWidth + 1 &&
        el.scrollHeight <= el.clientHeight + 1
      ) {
        setFontSize(hi)
        setState("fit")
        setEffectiveLines(1)
        return
      }

      let lo = minSize
      let high = hi
      let fitSize = lo

      while (high - lo > 1) {
        const mid = Math.floor((lo + high) / 2)
        el.style.fontSize = `${mid}px`
        if (
          el.scrollWidth <= el.clientWidth + 1 &&
          el.scrollHeight <= el.clientHeight + 1
        ) {
          fitSize = mid
          lo = mid
        } else {
          high = mid
        }
      }

      if (fitSize > minSize) {
        el.style.fontSize = `${fitSize}px`
        setFontSize(fitSize)
        setState("fit")
        setEffectiveLines(1)
      } else {
        el.style.fontSize = `${minSize}px`
        setFontSize(minSize)
        setState("ellipsis")
        setEffectiveLines(1)
      }
    }

    schedule()

    const observer = new ResizeObserver(schedule)
    observer.observe(el)

    let cancelled = false
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) schedule()
      })
    }

    return () => {
      cancelled = true
      if (pending !== null) cancelAnimationFrame(pending)
      observer.disconnect()
    }
  }, [minSize, text, lines, ref])

  return { fontSize, state, effectiveLines }
}

export interface TextProps {
  align?: TextAlign
  className?: string
  fit?: TextFit | TextFitType
  fontStack?: string
  style?: CSSProperties
  text: string
  tone?: TextTone
  typography?: TextTypography
  size?: TextSize
  lineHeight?: number | string
  weight?:
    | "normal"
    | "semibold"
    | "bold"
    | "light"
    | "thin"
    | "extralight"
    | "black"
}

export function Text(props: TextProps): ReactElement {
  const fit = props.fit ?? "hidden"
  const align = props.align ?? "center"
  const tone = props.tone ?? "foreground"
  const typography = props.typography ?? "main"
  const size = props.size ?? "md"
  const lineHeight = props.lineHeight ?? 1
  const weight = props.weight ?? "normal"
  const themeUi = useThemeUiPresentation()
  const renderedChildren = renderTextChildren(props.text, lineHeight)

  if (themeUi?.primitives?.text) {
    return themeUi.primitives.text({
      align,
      text: props.text,
      fit,
      tone,
      typography,
      size: size,
      lineHeight,
    })
  }

  const resolvedFit = resolveTextFit(fit)
  const isAutofit = resolvedFit.type === "autofit"
  const containerRef = useRef<HTMLDivElement>(null)
  const autofit = useAutofit(
    containerRef,
    isAutofit ? (resolvedFit.minSize ?? 0) : 0,
    props.text,
    resolvedFit.lines,
  )

  const effectiveLines = isAutofit
    ? (autofit.effectiveLines ?? resolvedFit.lines)
    : resolvedFit.lines
  const isMultiLineEffective = effectiveLines > 1

  const applyAutofitEllipsis = isAutofit && isMultiLineEffective

  const isMultiLineEllipsis =
    (resolvedFit.type === "ellipsis" && resolvedFit.lines > 1) ||
    applyAutofitEllipsis

  const fitModesClasses: Record<TextFitType, string> = {
    ellipsis: isMultiLineEllipsis
      ? "overflow-hidden"
      : "overflow-hidden whitespace-nowrap text-ellipsis",
    shrink: "sireno-text-fit-shrink whitespace-normal break-words",
    hidden: "overflow-hidden ",
    autofit: isMultiLineEffective
      ? "overflow-hidden"
      : "overflow-hidden whitespace-nowrap text-ellipsis",
  }
  const composedStyle: CSSProperties =
    props.fontStack !== undefined
      ? { ...props.style, fontFamily: props.fontStack }
      : (props.style ?? {})

  if (isMultiLineEllipsis) {
    ;(composedStyle as CSSProperties & Record<string, string>)[
      "--sireno-text-lines"
    ] = String(effectiveLines)
    composedStyle.overflow = "hidden"
  }

  if (isAutofit) {
    composedStyle.fontSize =
      autofit.fontSize !== null ? `${autofit.fontSize}px` : ""
  }

  if (lineHeight !== 1) {
    composedStyle.lineHeight =
      typeof lineHeight === "number" && Number.isFinite(lineHeight)
        ? `${lineHeight}em`
        : (lineHeight as string)
  }

  if (resolvedFit.reserveSpace) {
    const lh =
      typeof lineHeight === "number" && Number.isFinite(lineHeight)
        ? lineHeight
        : 1.2

    composedStyle.minHeight = `${resolvedFit.lines * lh}em`
    composedStyle.height = `${resolvedFit.lines * lh}em`
  }

  const dataFit = `${resolvedFit.type}-${resolvedFit.lines}`
  return (
    <div
      ref={containerRef}
      className={cn([
        "block max-w-full min-w-0 leading-tight",
        TYPOGRAPHY_CLASS[typography],
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        fitModesClasses[resolvedFit.type],
        isMultiLineEllipsis ? "sireno-text-fit-multiline" : "",
        props.className,
      ])}
      data-sireno-text-fit={dataFit}
      data-sireno-text-shrink-state={
        resolvedFit.type === "shrink" ? "pending" : undefined
      }
      data-sireno-text-size={size}
      data-sireno-text-autofit-state={isAutofit ? autofit.state : undefined}
      data-sireno-ui-text="true"
      style={composedStyle}
    >
      {renderedChildren}
    </div>
  )
}
