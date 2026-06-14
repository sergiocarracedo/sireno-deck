import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MainLabelSurface } from '../MainLabelSurface'

describe('MainLabelSurface', () => {
  it('renders an icon source string via the Icon component', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface main="icon://plus" label="Add" />,
    )
    expect(html).toContain('Add')
    expect(html).toContain('lucide-plus')
  })

  it('renders a brand icon source', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface main="brand://github" label="GitHub" />,
    )
    expect(html).toContain('GitHub')
  })

  it('renders an asset path (svg) via the Icon src', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface main="./clock.svg" label="Clock" />,
    )
    expect(html).toContain('Clock')
  })

  it('renders an addon:// path as an icon source', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface
        main="addon://emoji-selector/smileys.svg"
        label="Smileys"
      />,
    )
    expect(html).toContain('Smileys')
  })

  it('renders an emoji char as a text glyph', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface main="😀" label="Grin" />,
    )
    expect(html).toContain('😀')
    expect(html).toContain('Grin')
    expect(html).toContain('text-2xl')
  })

  it('renders a multi-codepoint emoji (e.g. airplane + variation selector) as a text glyph', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface main={'✈\uFE0F'} label="Travel" />,
    )
    expect(html).toContain('Travel')
  })

  it('renders an IconProps object passed through to Icon', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface
        main={{ name: 'plus', size: 24, tone: 'accent' }}
        label="Add"
      />,
    )
    expect(html).toContain('Add')
  })

  it('renders only the label when main is omitted', () => {
    const html = renderToStaticMarkup(
      <MainLabelSurface label="Orphan" />,
    )
    expect(html).toContain('Orphan')
  })
})
