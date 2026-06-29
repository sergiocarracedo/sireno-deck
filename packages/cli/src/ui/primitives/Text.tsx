import { createElement, type CSSProperties, type ReactElement, type ReactNode } from 'react'

import { cn } from '../utils/cn.ts'
import { useThemeUiPresentation } from '../theme-presentation.tsx'

const ALIGN_CLASS = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
} as const

const TONE_CLASS = {
  accent: 'text-accent',
  danger: 'text-danger',
  foreground: 'text-foreground',
  'foreground-contrast': 'text-foreground-contrast',
  primary: 'text-primary',
  success: 'text-success',
} as const

const TYPOGRAPHY_CLASS = {
  aux: 'font-aux',
  main: 'font-main',
  mono: 'font-mono',
} as const

const SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '5xl': 'text-5xl',
} as const

const RICH_TONE_TAGS = ['accent', 'danger', 'foreground', 'primary', 'success'] as const
const RICH_SIZE_TAGS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '5xl'] as const

type RichToneTag = (typeof RICH_TONE_TAGS)[number]
type RichSizeTag = (typeof RICH_SIZE_TAGS)[number]
type RichMarkupTag = 'blink' | 'dim' | 'highlight' | RichToneTag | RichSizeTag

type RichTextNode =
  | { type: 'line-break' }
  | { type: 'tag'; tag: RichMarkupTag; children: RichTextNode[] }
  | { type: 'text'; value: string }

type ParseStop =
  | { kind: 'highlight' }
  | { kind: 'tag'; tag: Exclude<RichMarkupTag, 'highlight'> }

const RICH_TAG_NAMES = new Set<string>([...RICH_TONE_TAGS, ...RICH_SIZE_TAGS, 'blink', 'dim'])

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
        if (!RICH_TAG_NAMES.has(tagName)) {
          return null
        }

        flushText()
        index = closeIndex + 1
        textStart = index

        const children = parseSequence({
          kind: 'tag',
          tag: tagName as Exclude<RichMarkupTag, 'highlight'>,
        })
        if (children === null) {
          return null
        }

        nodes.push({
          type: 'tag',
          tag: tagName as Exclude<RichMarkupTag, 'highlight'>,
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

    return (
      <span className={cn(classNames)} data-sireno-rich-text-tag={node.tag} key={key}>
        {renderRichTextNodes(node.children, key, className)}
      </span>
    )
  })
}

function renderTextChildren(children: ReactNode, lineHeight: number | string): ReactNode {
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

export interface TextProps {
  align?: TextAlign
  children: ReactNode
  className?: string
  fit?: TextFit
  fontStack?: string
  style?: CSSProperties
  tone?: TextTone
  typography?: TextTypography
  size?: TextSize
  lineHeight?: number | string
}

export function Text(props: TextProps): ReactElement {
  const fit = props.fit ?? 'wrap'
  const align = props.align ?? 'center'
  const tone = props.tone ?? 'foreground'
  const typography = props.typography ?? 'main'
  const size = props.size ?? 'md'
  const lineHeight = props.lineHeight ?? 1
  const themeUi = useThemeUiPresentation()
  const renderedChildren = renderTextChildren(props.children, lineHeight)

  if (themeUi?.text) {
    return themeUi.text({
      align,
      children: renderedChildren,
      fit,
      tone,
      typography,
      size: size,
    })
  }

  const fitModesClasses = {
    wrap: 'whitespace-normal break-words',
    ellipsis: 'overflow-hidden whitespace-nowrap text-ellipsis',
    shrink: 'sireno-text-fit-shrink whitespace-normal break-words',
    hidden: 'overflow-hidden whitespace-nowrap',
  }

  const composedStyle =
    props.fontStack !== undefined ? { ...props.style, fontFamily: props.fontStack } : props.style

  return (
    <div
      className={cn([
        'block max-w-full min-w-0 leading-tight',
        TYPOGRAPHY_CLASS[typography],
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
        SIZE_CLASS[size],
        fitModesClasses[fit],
        props.className,
        lineHeight !== 1 ? `!leading-[${lineHeight}]` : null,
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
