import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { renderReactNodeToHtml } from '@/render/dom-host'
import { UNKNOWN_HOST_CONTEXT } from '@/system/host-context'

import {
  buildPageNavButton,
  definePagedCategoryButton,
  paginateDecks,
} from './pagination'
import { builtinChangeDeckButton } from '@/builtin-addons/core-buttons/buttons/change-deck'

function createMethodsDouble() {
  return {
    getActiveDeckId: () => 'main',
    goBack: vi.fn(),
    invalidate: vi.fn(),
    navigateToDeck: vi.fn(),
    pasteText: vi.fn(),
    runCommand: vi.fn(),
  }
}

function createProps<TConfig>(
  definition: { render: (props: unknown) => unknown },
  config: TConfig,
  position: number,
  methods: ReturnType<typeof createMethodsDouble>,
) {
  return {
    button: { position, type: 'test' },
    config,
    frameState: 'idle' as const,
    hostContext: UNKNOWN_HOST_CONTEXT,
    methods,
    pressed: false,
    store: {
      addon: {
        clear: () => {},
        get snapshot() {
          return undefined
        },
        set: () => {},
        update: () => {},
      },
      button: {
        clear: () => {},
        get snapshot() {
          return undefined
        },
        set: () => {},
        update: () => {},
      },
    },
    theme: {} as never,
  } as unknown as Parameters<typeof definition.render>[0]
}

describe('buildPageNavButton', () => {
  it('returns a middle-page config with prev/next targets and position keyCount-2', () => {
    expect(buildPageNavButton(2, 5, 'cat-p1', 'cat-p3')).toEqual({
      label: 'Page',
      meta: 'page-nav',
      position: 13,
      target_deck: 'cat-p3',
      target_deck_double_tap: 'cat-p1',
      type: 'change-deck',
    })
  })

  it('honors a custom keyCount for the position', () => {
    expect(buildPageNavButton(2, 5, 'cat-p1', 'cat-p3', { keyCount: 9 }).position).toBe(7)
  })

  it('treats the first page as a no-op on double-tap (target resolves to the current deck)', () => {
    const config = buildPageNavButton(1, 5, null, 'cat-p2')
    expect(config.target_deck).toBe('cat-p2')
    expect(config.target_deck_double_tap).toBe('cat-p1')
  })

  it('treats the last page as a no-op on tap (target resolves to the current deck)', () => {
    const config = buildPageNavButton(5, 5, 'cat-p4', null)
    expect(config.target_deck).toBe('cat-p5')
    expect(config.target_deck_double_tap).toBe('cat-p4')
  })
})

describe('change-deck page-nav wiring', () => {
  it('calls navigateToDeck with addToHistory false on tap (next page)', async () => {
    const methods = createMethodsDouble()
    const config = buildPageNavButton(2, 5, 'cat-p1', 'cat-p3')
    const props = createProps(builtinChangeDeckButton, config, 13, methods)
    await builtinChangeDeckButton.onTap!(props)
    expect(methods.navigateToDeck).toHaveBeenCalledWith('cat-p3', { addToHistory: false })
  })

  it('calls navigateToDeck with addToHistory false on double-tap (previous page)', async () => {
    const methods = createMethodsDouble()
    const config = buildPageNavButton(2, 5, 'cat-p1', 'cat-p3')
    const props = createProps(builtinChangeDeckButton, config, 13, methods)
    await builtinChangeDeckButton.onDblTap!(props)
    expect(methods.navigateToDeck).toHaveBeenCalledWith('cat-p1', { addToHistory: false })
  })
})

describe('definePagedCategoryButton', () => {
  const schema = z.object({ target_deck: z.string().min(1) }).strict()

  it('navigates to the derived deck id with addToHistory true on tap', async () => {
    const button = definePagedCategoryButton({
      configSchema: schema,
      getTargetDeckId: (config) => config.target_deck,
      render: () => null as never,
      type: 'test-paged-category',
    })
    const methods = createMethodsDouble()
    const props = createProps(button, { target_deck: 'cat-p1' }, 0, methods)
    await button.onTap!(props)
    expect(methods.navigateToDeck).toHaveBeenCalledWith('cat-p1', { addToHistory: true })
  })

  it('does not push the page-nav semantic (addToHistory true) — distinct from page-to-page', async () => {
    const button = definePagedCategoryButton({
      configSchema: schema,
      getTargetDeckId: (config) => config.target_deck,
      render: () => null as never,
      type: 'test-paged-category',
    })
    const methods = createMethodsDouble()
    const props = createProps(button, { target_deck: 'cat-p2' }, 0, methods)
    await button.onTap!(props)
    const call = methods.navigateToDeck.mock.calls[0]?.[1]
    expect(call).toEqual({ addToHistory: true })
  })
})

describe('paginateDecks', () => {
  it('yields three pages with stable suffixes and inclusive endIndex', () => {
    const pages = paginateDecks({ baseDeckId: 'cat', pageSize: 12, totalItems: 30 })
    expect(pages).toEqual([
      { deckId: 'cat-p1', endIndex: 11, pageNumber: 1, startIndex: 0 },
      { deckId: 'cat-p2', endIndex: 23, pageNumber: 2, startIndex: 12 },
      { deckId: 'cat-p3', endIndex: 29, pageNumber: 3, startIndex: 24 },
    ])
  })

  it('clamps the last page endIndex to the last item', () => {
    const pages = paginateDecks({ baseDeckId: 'cat', pageSize: 12, totalItems: 25 })
    expect(pages.at(-1)).toMatchObject({ endIndex: 24 })
  })

  it('returns an empty list when totalItems is zero', () => {
    expect(paginateDecks({ baseDeckId: 'cat', pageSize: 12, totalItems: 0 })).toEqual([])
  })
})

describe('change-deck page-nav render', () => {
  it('emits the actual Chip element with the page-nav meta (not raw Tailwind divs)', () => {
    const config = buildPageNavButton(2, 5, 'cat-p1', 'cat-p3')
    const methods = createMethodsDouble()
    const props = createProps(builtinChangeDeckButton, config, 13, methods)
    const html = renderReactNodeToHtml(builtinChangeDeckButton.render(props) as never)
    expect(html).toContain('data-sireno-ui-chip="true"')
    expect(html).toContain('Tap')
    expect(html).toContain('Dbl Tap')
    const chipMatches = html.match(/data-sireno-ui-chip="true"/g) ?? []
    expect(chipMatches.length).toBe(2)
  })
})
