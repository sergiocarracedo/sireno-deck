import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '../render/dom-host.js'
import { Bars } from './Bars.js'

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
})
