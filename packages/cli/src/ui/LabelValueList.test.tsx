import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '../render/dom-host.js'
import { Icon } from './Icon.js'
import { LabelValueList } from './LabelValueList.js'

describe('LabelValueList', () => {
  it('auto-selects the single-line layout', () => {
    const html = renderReactNodeToHtml(
      createElement(LabelValueList, {
        lines: [{ icon: createElement(Icon, { icon: 'clock' }), label: 'temp', units: 'C', value: '22.5' }],
      }),
    )

    expect(html).toContain('data-sireno-ui-label-value-list="true"')
    expect(html).toContain('data-sireno-label-value-layout="single"')
    expect(html).toContain('22.5')
  })

  it('auto-selects the double-line layout', () => {
    const html = renderReactNodeToHtml(
      createElement(LabelValueList, {
        lines: [
          { label: 'up', units: 'Mb', value: '12' },
          { label: 'dn', units: 'Mb', value: '245' },
        ],
      }),
    )

    expect(html).toContain('data-sireno-label-value-layout="double"')
    expect(html).toContain('up')
    expect(html).toContain('dn')
  })

  it('auto-selects the stacked layout for three or four lines', () => {
    const html = renderReactNodeToHtml(
      createElement(LabelValueList, {
        lines: [
          { label: 'cpu', value: '45%' },
          { label: 'gpu', value: '62C' },
          { label: 'ram', value: '8GB' },
        ],
      }),
    )

    expect(html).toContain('data-sireno-label-value-layout="stack"')
    expect(html).toContain('cpu')
    expect(html).toContain('gpu')
    expect(html).toContain('ram')
  })

  it('rejects counts outside the 1-4 line contract', () => {
    expect(() =>
      LabelValueList({
        lines: [] as unknown as Parameters<typeof LabelValueList>[0]['lines'],
      }),
    ).toThrow('LabelValueList supports 1-4 lines')

    expect(() =>
      LabelValueList({
        lines: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
          { label: 'c', value: '3' },
          { label: 'd', value: '4' },
          { label: 'e', value: '5' },
        ] as unknown as Parameters<typeof LabelValueList>[0]['lines'],
      }),
    ).toThrow('LabelValueList supports 1-4 lines')
  })
})
