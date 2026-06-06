import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Text } from './Text.js'

function renderText(props: Parameters<typeof Text>[0]): string {
  return renderToStaticMarkup(createElement(Text, props))
}

describe('Text', () => {
  it('renders the 5xl size with the matching data-sireno-text-size', () => {
    const html = renderText({ size: '5xl', children: 'big' })
    expect(html).toContain('data-sireno-text-size="5xl"')
    expect(html).toContain('text-5xl')
  })

  it('applies the fontStack prop as inline style.fontFamily', () => {
    const fontStack =
      "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif"
    const html = renderText({ children: '🔥', fontStack })
    expect(html).toContain('font-family:')
    expect(html).toContain('Apple Color Emoji')
    expect(html).toContain('Noto Color Emoji')
  })

  it('does not set fontFamily when fontStack is omitted', () => {
    const html = renderText({ children: 'no font stack' })
    expect(html).not.toContain('font-family')
  })
})
