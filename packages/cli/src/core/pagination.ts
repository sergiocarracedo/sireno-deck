export const NEXT_PAGE_MARKER = "__nextPageMarker" as const

export type NextPageMarker = typeof NEXT_PAGE_MARKER

export interface PaginatedItem<T> {
  readonly id: string
  readonly value: T
}

export interface Page<T> {
  readonly items: ReadonlyArray<PaginatedItem<T> | null>
  readonly pageIndex: number
  readonly totalPages: number
  readonly hasNext: boolean
  readonly hasPrev: boolean
}

export interface PaginationResult<T> {
  readonly pages: ReadonlyArray<Page<T>>
  readonly totalItems: number
}

export interface PaginateOptions {
  readonly keyCount: number
  readonly pageSize?: number
}

export const paginationReservedPositions = (
  keyCount: number,
  paginated: boolean,
): number[] => (paginated && keyCount > 1 ? [keyCount - 2] : [])

const buildPageItem = <T>(id: string, value: T): PaginatedItem<T> => ({
  id,
  value,
})

export const paginate = <T>(
  items: ReadonlyArray<T>,
  opts: PaginateOptions,
): PaginationResult<T> => {
  if (opts.keyCount <= 0) {
    throw new Error("paginate: keyCount must be > 0")
  }
  const pageSize = opts.pageSize ?? opts.keyCount - 2
  if (pageSize <= 0) {
    throw new Error("paginate: pageSize must be > 0")
  }

  const totalItems = items.length
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize)
  if (totalPages === 0) {
    return { pages: [], totalItems: 0 }
  }

  const pages: Array<Page<T>> = []
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const start = pageIndex * pageSize
    const end = Math.min(start + pageSize, totalItems)
    const slice = items.slice(start, end)

    const pageItems: Array<PaginatedItem<T> | null> = slice.map((value, i) =>
      buildPageItem(`${pageIndex}-${i}`, value),
    )

    const hasMultiplePages = totalPages > 1
    if (hasMultiplePages) {
      const isFullPage = pageItems.length >= pageSize
      const markerIndex = isFullPage ? pageSize - 1 : pageItems.length
      pageItems.splice(markerIndex, 0, {
        id: NEXT_PAGE_MARKER,
        value: NEXT_PAGE_MARKER,
      } as PaginatedItem<T>)
    }

    while (pageItems.length < pageSize) {
      pageItems.push(null)
    }

    pages.push({
      items: pageItems,
      pageIndex,
      totalPages,
      hasNext: pageIndex < totalPages - 1,
      hasPrev: pageIndex > 0,
    })
  }

  return { pages, totalItems }
}
