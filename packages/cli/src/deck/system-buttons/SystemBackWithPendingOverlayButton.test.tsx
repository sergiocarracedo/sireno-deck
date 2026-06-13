import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import type { DeckConfig } from '@/core/schemas'
import { renderReactNodeToHtml } from '@/render/dom-host'
import { SystemBackWithPendingOverlayButton } from './SystemBackWithPendingOverlayButton'

function makeDeck(overrides: Partial<DeckConfig> = {}): DeckConfig {
  return {
    buttons: [],
    id: 'chrome',
    name: 'Chrome',
    ...overrides,
  }
}

describe('SystemBackWithPendingOverlayButton', () => {
  it('renders the "Tap" line with undo2 icon and labels the variant', () => {
    const html = renderReactNodeToHtml(
      createElement(SystemBackWithPendingOverlayButton, {
        pendingOverlayDeck: makeDeck(),
      }),
    )

    expect(html).toContain('data-sireno-system-back="2-line-pending"')
    expect(html).toContain('data-sireno-system-back-line="1"')
    expect(html).toContain('lucide-undo2')
    expect(html).toContain('Tap')
  })

  it('renders the "2xTap" line with the deck emoji extracted from the deck name', () => {
    const html = renderReactNodeToHtml(
      createElement(SystemBackWithPendingOverlayButton, {
        pendingOverlayDeck: makeDeck({ name: '📺 Netflix' }),
      }),
    )

    expect(html).toContain('data-sireno-system-back-line="2"')
    expect(html).toContain('sireno-pending-overlay-deck-emoji')
    expect(html).toContain('📺')
    expect(html).toContain('2xTap')
  })

  it('renders a generic layout-grid lucide icon in line 2 when the deck name has no emoji', () => {
    const html = renderReactNodeToHtml(
      createElement(SystemBackWithPendingOverlayButton, {
        pendingOverlayDeck: makeDeck({ id: 'plain-deck', name: 'Plain Deck' }),
      }),
    )

    expect(html).toContain('lucide-layout-grid')
    expect(html).not.toContain('sireno-pending-overlay-deck-emoji')
  })

  it('falls back to the deck id when the deck has no name', () => {
    const html = renderReactNodeToHtml(
      createElement(SystemBackWithPendingOverlayButton, {
        pendingOverlayDeck: makeDeck({ id: 'chrome-overlay', name: undefined }),
      }),
    )

    expect(html).toContain('data-sireno-system-back="2-line-pending"')
    expect(html).toContain('lucide-layout-grid')
    expect(html).toContain('2xTap')
  })
})
