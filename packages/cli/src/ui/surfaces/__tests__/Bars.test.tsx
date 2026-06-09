import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'
import { Bars } from '../surfaces/Bars'

describe('Bars', () => {
  it('renders bounded bar counts through the shared UI surface', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [
          { color: '#8ecae6', maxValue: 100, title: 'cpu', value: 45 },
          { color: '#cdb4db', maxValue: 100, title: 'ram', value: 62 },
          { color: '#adb5bd', maxValue: 100, title: 'disk', value: 18 },
        ],
      }),
    )

    expect(html).toContain('data-sireno-ui-bars="true"')
    expect(html).toContain('data-sireno-bars-count="3"')
    expect(html).toContain('cpu')
    expect(html).toContain('ram')
    expect(html).toContain('disk')
  })

  it('falls back to the authoritative Sireno primary token when a bar color is omitted', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ maxValue: 100, title: 'cpu', value: 45 }],
      }),
    )

    expect(html).toContain('var(--sireno-color-primary)')
    expect(html).not.toContain('var(--color-primary)')
  })

  it('rejects counts outside the 1-3 item contract', () => {
    expect(() =>
      Bars({
        items: [] as unknown as Parameters<typeof Bars>[0]['items'],
      }),
    ).toThrow('Bars supports 1-3 items')

    expect(() =>
      Bars({
        items: [
          { maxValue: 100, title: 'a', value: 1 },
          { maxValue: 100, title: 'b', value: 2 },
          { maxValue: 100, title: 'c', value: 3 },
          { maxValue: 100, title: 'd', value: 4 },
        ] as unknown as Parameters<typeof Bars>[0]['items'],
      }),
    ).toThrow('Bars supports 1-3 items')
  })

  it('renders the value as rotated text inside the bar fill', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [
          { displayValue: '12.3 GB', maxValue: 100, title: 'ram', value: 78 },
        ],
      }),
    )

    expect(html).toContain('sireno-bars-value')
    expect(html).toContain('12.3 GB')
    expect(html).toContain('transform:rotate(-90deg)')
    expect(html).toContain('mix-blend-mode:difference')
  })

  it('falls back to Math.round(value) when displayValue is omitted', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ maxValue: 100, title: 'cpu', value: 45.7 }],
      }),
    )

    expect(html).toContain('sireno-bars-value')
    expect(html).toContain('>46<')
  })

  it('prefers displayValue over the rounded number', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [
          { displayValue: '67%', maxValue: 100, title: 'cpu', value: 67 },
        ],
      }),
    )

    expect(html).toContain('>67%<')
  })

  it('emits an explicit precomputed color in the sharp path', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ maxValue: 100, title: 'cpu', value: 45 }],
        themePrimaryHex: '#7dd3fc',
        useSharpPath: true,
      }),
    )

    expect(html).toContain('sireno-bars-value')
    expect(html).toContain('color:#822c03')
    expect(html).not.toContain('mix-blend-mode')
    expect(html).toContain('transform:rotate(-90deg)')
  })

  it('emits white text for a near-gray bar in the sharp path (luma 127 < 128)', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ color: '#7f7f7f', maxValue: 100, title: 'cpu', value: 45 }],
        useSharpPath: true,
      }),
    )

    expect(html).toContain('color:#ffffff')
  })

  it('falls back to the theme primary when item.color is a CSS variable', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ maxValue: 100, title: 'cpu', value: 45 }],
        themePrimaryHex: '#2563eb',
        useSharpPath: true,
      }),
    )

    expect(html).toContain('color:#da9c14')
  })

  it('emits a static white fallback when neither color nor theme is provided in the sharp path', () => {
    const html = renderReactNodeToHtml(
      createElement(Bars, {
        items: [{ maxValue: 100, title: 'cpu', value: 45 }],
        useSharpPath: true,
      }),
    )

    expect(html).toContain('color:#ffffff')
  })
})
