import {
  createElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'

import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'

const ALIGN_CLASS = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
} as const

const TONE_CLASS = {
  accent: 'text-accent',
  danger: 'text-danger',
  fg: 'text-fg',
  foreground: 'text-foreground',
  'foreground-contrast': 'text-foreground-contrast',
  primary: 'text-primary',
  success: 'text-success',
  muted: 'text-muted',
} as const

const TYPOGRAPHY_CLASS = {
  aux: 'font-aux',
  main: 'font-main',
  mono: 'font-mono',
} as const

const TEXT_WEIGHT = [
  'normal',
  'semibold',
  'bold',
  'light',
  'thin',
  'extralight',
  'black',
] as const

const WEIGHT_CLASS = {
  normal: 'font-normal',
  semibold: 'font-semibold',
  bold: 'font-bold',
  light: 'font-light',
  thin: 'font-thin',
  extralight: 'font-extralight',
  black: 'font-black',
} as const

const SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
} as const

const RICH_TONE_TAGS = [
  'accent',
  'danger',
  'foreground',
  'primary',
  'success',
] as const

const RICH_SIZE_TAGS = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
] as const

type RichToneTag = (typeof RICH_TONE_TAGS)[number]
type RichSizeTag = (typeof RICH_SIZE_TAGS)[number]
type RichMarkupTag = 'blink' | 'dim' | 'highlight' | RichToneTag | RichSizeTag

type RichTextNode =
  | { type: 'line-break' }
  | { type: 'nbsp' }
  | {
      type: 'tag'
      tag: string
      extraClasses?: string[]
      children: RichTextNode[]
    }
  | { type: 'text'; value: string }

type ParseStop =
  | { kind: 'highlight' }
  | { kind: 'tag'; tag: Exclude<RichMarkupTag, 'highlight'> }

const RICH_TAG_NAMES = new Set<string>([
  ...RICH_TONE_TAGS,
  ...RICH_SIZE_TAGS,
  'blink',
  'dim',
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
        nodes.push({ type: 'text', value: input.slice(textStart, index) })
      }
    }

    while (index < input.length) {
      if (stop?.kind === 'highlight' && input[index] === '*') {
        flushText()
        index += 1
        return nodes
      }

      if (stop?.kind === 'tag' && input.startsWith(`</${stop.tag}>`, index)) {
        flushText()
        index += stop.tag.length + 3
        return nodes
      }

      const current = input[index]

      if (current === '|') {
        flushText()
        nodes.push({ type: 'line-break' })
        index += 1
        textStart = index
        continue
      }

      if (current === '&' && input.slice(index, index + 6) === '&nbsp;') {
        flushText()
        nodes.push({ type: 'nbsp' })
        index += 6
        textStart = index
        continue
      }

      if (current === '*') {
        flushText()
        index += 1
        textStart = index
        const children = parseSequence({ kind: 'highlight' })
        if (children === null) {
          return null
        }
        nodes.push({ type: 'tag', tag: 'highlight', children })
        textStart = index
        continue
      }

      if (current === '<') {
        if (input.startsWith('</', index)) {
          return null
        }

        const closeIndex = input.indexOf('>', index + 1)
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
          kind: 'tag',
          tag: baseTag as Exclude<RichMarkupTag, 'highlight'>,
        })
        if (children === null) {
          return null
        }

        nodes.push({
          type: 'tag',
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
  return nodes.every((node) => node.type === 'text')
}

function renderRichTextNodes(
  nodes: RichTextNode[],
  keyPrefix: string,
  className?: string,
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.type === 'text') {
      return node.value
    }

    if (node.type === 'line-break') {
      return createElement('span', {
        className: 'sireno-rich-text-break',
        'data-sireno-rich-text-tag': 'line-break',
        key,
      })
    }

    if (node.type === 'nbsp') {
      return createElement('span', { key, 'aria-hidden': 'true' }, '\u00A0')
    }

    const classNames = ['sireno-rich-text-node', className]

    if (node.tag === 'blink') {
      classNames.push('sireno-rich-text-blink')
    }

    if (node.tag === 'dim') {
      classNames.push('opacity-50')
    }

    if (node.tag === 'highlight') {
      classNames.push('sireno-rich-text-strong', TONE_CLASS.primary)
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
  if (typeof children !== 'string') {
    return children
  }

  const parsed = parseRichText(children)
  if (parsed === null || isPlainTextTree(parsed)) {
    return children
  }

  return renderRichTextNodes(parsed, 'rich', '!leading-[inherit]')
}

export type TextAlign = keyof typeof ALIGN_CLASS
export type TextFit = 'ellipsis' | 'shrink' | 'wrap' | 'hidden'
export type TextTone = keyof typeof TONE_CLASS
export type TextTypography = keyof typeof TYPOGRAPHY_CLASS
export type TextSize = keyof typeof SIZE_CLASS
export type TextWeight = (typeof TEXT_WEIGHT)[number]

export interface TextProps {
  align?: TextAlign
  className?: string
  fit?: TextFit
  fontStack?: string
  style?: CSSProperties
  text: string
  tone?: TextTone
  typography?: TextTypography
  size?: TextSize
  lineHeight?: number | string
  weight?:
    | 'normal'
    | 'semibold'
    | 'bold'
    | 'light'
    | 'thin'
    | 'extralight'
    | 'black'
}

export function Text(props: TextProps): ReactElement {
  const fit = props.fit ?? 'wrap'
  const align = props.align ?? 'center'
  const tone = props.tone ?? 'foreground'
  const typography = props.typography ?? 'main'
  const size = props.size ?? 'md'
  const lineHeight = props.lineHeight ?? 1
  const weight = props.weight ?? 'normal'
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

  const fitModesClasses = {
    wrap: 'whitespace-normal break-words',
    ellipsis: 'overflow-hidden whitespace-nowrap text-ellipsis',
    shrink: 'sireno-text-fit-shrink whitespace-normal break-words',
    hidden: 'overflow-hidden whitespace-nowrap',
  }
  const composedStyle: CSSProperties =
    props.fontStack !== undefined
      ? { ...props.style, fontFamily: props.fontStack }
      : (props.style ?? {})
  if (lineHeight !== 1) {
    composedStyle.lineHeight =
      typeof lineHeight === 'number' && Number.isFinite(lineHeight)
        ? `${lineHeight}em`
        : (lineHeight as string)
  }
  return (
    <div
      className={cn([
        'block max-w-full min-w-0 leading-tight',
        TYPOGRAPHY_CLASS[typography],
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        fitModesClasses[fit],
        props.className,
      ])}
      data-sireno-text-fit={fit}
      data-sireno-text-shrink-state={fit === 'shrink' ? 'pending' : undefined}
      data-sireno-text-size={size}
      data-sireno-ui-text="true"
      style={composedStyle}
    >
      {renderedChildren}
    </div>
  )
}
