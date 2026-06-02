import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '../render/dom-host.js'
import { Icon } from './Icon.js'

describe('Icon', () => {
  it('resolves kebab-case Lucide names through the live export surface', () => {
    const html = renderReactNodeToHtml(
      createElement(Icon, { icon: 'triangle-alert', tone: 'danger' }),
    )

    expect(html).toContain('data-sireno-icon-source="generic"')
    expect(html).toContain('data-sireno-ui-icon="true"')
    expect(html).toContain('text-danger')
  })

  it('accepts camelCase and snake_case Lucide names too', () => {
    const camelHtml = renderReactNodeToHtml(
      createElement(Icon, { icon: 'triangleAlert' }),
    )
    const snakeHtml = renderReactNodeToHtml(
      createElement(Icon, { icon: 'triangle_alert' }),
    )

    expect(camelHtml).toContain('data-sireno-icon-source="generic"')
    expect(snakeHtml).toContain('data-sireno-icon-source="generic"')
  })

  it('renders current generic caller names like square and clock', () => {
    const squareHtml = renderReactNodeToHtml(createElement(Icon, { icon: 'square' }))
    const clockHtml = renderReactNodeToHtml(createElement(Icon, { icon: 'clock' }))

    expect(squareHtml).toContain('data-sireno-icon-source="generic"')
    expect(clockHtml).toContain('data-sireno-icon-source="generic"')
  })

  it('throws for unknown generic icon names', () => {
    expect(() =>
      renderReactNodeToHtml(
        createElement(Icon, { icon: 'definitely-not-a-real-icon' }),
      ),
    ).toThrow('Unknown Lucide icon: definitely-not-a-real-icon')
  })
})
