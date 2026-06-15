import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SplitActionSurface } from '../SplitActionSurface'

describe('SplitActionSurface', () => {
  it('renders primary content when secondary is omitted', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface primary={<span>Primary</span>} />,
    )
    expect(html).toContain('Primary')
    expect(html).not.toContain('clip-path')
  })

  it('renders primary and secondary content when both provided', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    expect(html).toContain('Primary')
    expect(html).toContain('Secondary')
  })

  it('wraps in a flex-col size-full container in mode 2', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    expect(html).toContain('flex-col')
    expect(html).toContain('size-full')
  })

  it('stacks primary and secondary in equal flex halves', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    const flexMatches = html.match(/flex-1/g)
    expect(flexMatches).toHaveLength(2)
  })

  it('scales inner containers to fit the split halves', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    const scaleMatches = html.match(/scale-\[0\.65\]/g)
    expect(scaleMatches).toHaveLength(2)
  })

  it('renders a -rotate-45 diagonal separator in mode 2', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    expect(html).toContain('<hr')
    expect(html).toContain('-rotate-45')
  })

  it('renders TAP and TAPx2 labels in mode 2', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface
        primary={<span>Primary</span>}
        secondary={<span>Secondary</span>}
      />,
    )
    expect(html).toContain('TAP')
    expect(html).toContain('TAPx2')
  })

  it('omits the diagonal separator and TAPx2 label in mode 1', () => {
    const html = renderToStaticMarkup(
      <SplitActionSurface primary={<span>Primary</span>} />,
    )
    expect(html).not.toContain('<hr')
    expect(html).not.toContain('-rotate-45')
    expect(html).not.toContain('TAPx2')
  })
})
