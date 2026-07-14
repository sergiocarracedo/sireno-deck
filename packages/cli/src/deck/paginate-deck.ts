import type { AddonGeneratedDeck } from "@/addon/api"
import {
  NEXT_PAGE_MARKER,
  type NextPageMarker,
  paginate,
} from "@/core/pagination"

export interface PageDeckResult {
  readonly deckId: string
  readonly pageIndex: number
  readonly totalPages: number
  readonly deck: AddonGeneratedDeck
}

export interface PaginateDeckOptions {
  readonly baseDeckId: string
  readonly buttons: readonly unknown[]
  readonly keyCount: number
}

const PAGE_NAV_BUTTON_TYPE = "core:page-nav"

const isNextPageMarker = (
  item: { id: string; value: unknown } | null,
): item is { id: NextPageMarker; value: unknown } =>
  item !== null && item.value === NEXT_PAGE_MARKER

export const paginateDeck = (opts: PaginateDeckOptions): PageDeckResult[] => {
  const { baseDeckId, buttons, keyCount } = opts

  const result = paginate(buttons, { keyCount })
  if (result.pages.length === 0) {
    return []
  }

  return result.pages.map((page, pageIndex) => {
    const isFirstPage = pageIndex === 0
    const isLastPage = pageIndex === result.pages.length - 1
    const totalPages = result.pages.length

    const deckButtons: unknown[] = []
    let emojiCount = 0

    for (const item of page.items) {
      if (isNextPageMarker(item)) {
        const prevDeckId = isFirstPage
          ? baseDeckId
          : `${baseDeckId}-p${pageIndex}`
        const nextDeckId = isLastPage
          ? baseDeckId
          : `${baseDeckId}-p${pageIndex + 2}`
        const pageNavPosition = keyCount - 2
        for (let i = deckButtons.length - 1; i >= 0; i--) {
          const existing = deckButtons[i] as Record<string, unknown>
          if (existing?.position === pageNavPosition) {
            deckButtons.splice(i, 1)
          }
        }
        deckButtons.push({
          type: PAGE_NAV_BUTTON_TYPE,
          position: pageNavPosition,
          config: {
            currentPage: pageIndex + 1,
            totalPages,
            prevDeckId,
            nextDeckId,
          },
        })
      } else if (item !== null) {
        deckButtons.push({
          ...((item as { value: unknown }).value as Record<string, unknown>),
          position: emojiCount,
        })
        emojiCount++
      }
    }

    const deckId =
      totalPages === 1 ? baseDeckId : `${baseDeckId}-p${pageIndex + 1}`

    return {
      deckId,
      pageIndex,
      totalPages,
      deck: {
        buttons: deckButtons,
      },
    }
  })
}
