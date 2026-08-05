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

  const pageNavPosition = keyCount - 2

  return result.pages.map((page, pageIndex) => {
    const isFirstPage = pageIndex === 0
    const isLastPage = pageIndex === result.pages.length - 1
    const totalPages = result.pages.length
    const deckId =
      totalPages === 1 ? baseDeckId : `${baseDeckId}-p${pageIndex + 1}`

    const deckButtons: unknown[] = []

    for (const item of page.items) {
      if (isNextPageMarker(item)) {
        // ponytail: keep page-nav targets inside the page set. The base deck
        // id (e.g. chrome-overlay:shortcuts) is NOT a runtime deck (the pages
        // are -p1, -p2, -p3); navigating to it would no-op. First page's
        // prev and last page's next target the current page (no-op), so the
        // entry/exit to the overlay is via core:overlay-toggle only.
        const prevDeckId = isFirstPage ? deckId : `${baseDeckId}-p${pageIndex}`
        const nextDeckId = isLastPage
          ? deckId
          : `${baseDeckId}-p${pageIndex + 2}`

        for (let i = deckButtons.length - 1; i >= 0; i--) {
          const existing = deckButtons[i] as Record<string, unknown>
          if (existing?.position === pageNavPosition) {
            deckButtons.splice(i, 1)
          }
        }
        deckButtons.push({
          id: `${pageNavPosition}-${baseDeckId}-${pageIndex}`,
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
        // ponytail: emit each page-deck with LOCAL slot positions 0..N-1,
        // not the global page * (K-2) + slot encoding. The frontend renders
        // a fixed K-key grid per page; n-1 (sysBack) and n-2 (pageNav) are
        // reserved on every page independently.
        const slot = Number(item.id.split("-").pop() ?? "0")
        deckButtons.push({
          ...(item.value as Record<string, unknown>),
          position: slot,
        })
      }
    }

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
