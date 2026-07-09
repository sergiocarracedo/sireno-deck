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

const PAGE_NAV_BUTTON_TYPE = "core-buttons:page-nav"

const isNextPageMarker = (item: unknown): item is NextPageMarker =>
  item === NEXT_PAGE_MARKER

export const paginateDeck = (opts: PaginateDeckOptions): PageDeckResult[] => {
  const { baseDeckId, buttons, keyCount } = opts
  const pageSize = keyCount - 2

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
        deckButtons.push({
          type: PAGE_NAV_BUTTON_TYPE,
          position: keyCount - 2,
          config: {
            currentPage: pageIndex + 1,
            totalPages,
            prevDeckId,
            nextDeckId,
          },
        })
        emojiCount++
      } else if (item !== null) {
        deckButtons.push({
          ...item,
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
