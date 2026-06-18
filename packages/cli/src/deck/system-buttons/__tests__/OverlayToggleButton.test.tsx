import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import type { DeckConfig } from '@/core/schemas'
import { renderReactNodeToHtml } from '@/render/dom-host'
import { OverlayToggleButton } from './OverlayToggleButton'

function makeDeck(overrides: Partial<DeckConfig> = {}): DeckConfig {
  return {
    buttons: [],
    id: 'chrome',
    name: 'Chrome',
    ...overrides,
  }
}

describe('OverlayToggleButton', () => {
  it('renders the send-to-back icon and "Show App" label when no overlay is active', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, { activeOverlayDeck: null }),
    )

    expect(html).toContain('data-sireno-overlay-toggle="true"')
    expect(html).toContain('lucide-send-to-back')
    expect(html).toContain('Show App')
    expect(html).not.toContain('sireno-overlay-badge')
  })

  it('uses the active overlay deck name as the label', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, {
        activeOverlayDeck: makeDeck({ name: 'Spotify' }),
      }),
    )

    expect(html).toContain('Spotify')
    expect(html).toContain('sireno-overlay-badge')
  })

  it('falls back to the deck id when no name is provided', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, {
        activeOverlayDeck: makeDeck({ id: 'chrome-overlay', name: undefined }),
      }),
    )

    expect(html).toContain('chrome-overlay')
    expect(html).not.toContain('Show App')
  })

  it('renders the first emoji of the deck name as the badge glyph', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, {
        activeOverlayDeck: makeDeck({ name: '📺 Netflix' }),
      }),
    )

    expect(html).toContain('sireno-overlay-badge')
    expect(html).toContain('📺')
  })

  it('renders the uppercase first character of the deck name when no icon or emoji is configured', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, {
        activeOverlayDeck: makeDeck({ id: 'plain-deck', name: 'Plain Deck' }),
      }),
    )

    expect(html).toContain('sireno-overlay-badge')
    expect(html).toContain('>P<')
    expect(html).not.toContain('lucide-layout-grid')
  })

  it('renders the configured icon as the badge glyph when deck.icon is set', () => {
    const html = renderReactNodeToHtml(
      createElement(OverlayToggleButton, {
        activeOverlayDeck: makeDeck({
          icon: 'icon://app-window',
          name: 'My App',
        }),
      }),
    )

    expect(html).toContain('sireno-overlay-badge')
    expect(html).toContain('lucide-app-window')
    expect(html).not.toContain('lucide-layout-grid')
  })
})
