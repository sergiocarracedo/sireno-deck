import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'
import { Icon, resolveIconSpec } from '../Icon'

describe('Icon', () => {
  it('resolves kebab-case Lucide names through the live export surface', () => {
    const html = renderReactNodeToHtml(
      createElement(Icon, { name: 'triangle-alert', tone: 'danger' }),
    )

    expect(html).toContain('data-sireno-icon-source="generic"')
    expect(html).toContain('data-sireno-ui-icon="true"')
    expect(html).toContain('text-danger')
  })

  it('accepts camelCase and snake_case Lucide names too', () => {
    const camelHtml = renderReactNodeToHtml(
      createElement(Icon, { name: 'triangleAlert' }),
    )
    const snakeHtml = renderReactNodeToHtml(
      createElement(Icon, { name: 'triangle_alert' }),
    )

    expect(camelHtml).toContain('data-sireno-icon-source="generic"')
    expect(snakeHtml).toContain('data-sireno-icon-source="generic"')
  })

  it('renders current generic caller names like square and clock', () => {
    const squareHtml = renderReactNodeToHtml(
      createElement(Icon, { name: 'square' }),
    )
    const clockHtml = renderReactNodeToHtml(
      createElement(Icon, { name: 'clock' }),
    )

    expect(squareHtml).toContain('data-sireno-icon-source="generic"')
    expect(clockHtml).toContain('data-sireno-icon-source="generic"')
  })

  it('throws for unknown generic icon names', () => {
    expect(() =>
      renderReactNodeToHtml(
        createElement(Icon, { name: 'definitely-not-a-real-icon' }),
      ),
    ).toThrow('Unknown Lucide icon: definitely-not-a-real-icon')
  })
})

describe('resolveIconSpec', () => {
  it('routes icon:// names to the lucide name path', () => {
    expect(resolveIconSpec('icon://chevron-right')).toEqual({
      name: 'chevron-right',
    })
  })

  it('preserves addon:// and absolute paths under the src path', () => {
    expect(resolveIconSpec('addon://core-buttons/clock.svg')).toEqual({
      src: 'addon://core-buttons/clock.svg',
    })
    expect(resolveIconSpec('/abs/path/icon.png')).toEqual({
      src: '/abs/path/icon.png',
    })
  })

  it('returns undefined for missing or empty input', () => {
    expect(resolveIconSpec(undefined)).toBeUndefined()
    expect(resolveIconSpec('')).toBeUndefined()
  })
})
