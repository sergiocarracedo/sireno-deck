import type { ReactElement } from 'react'
import type { ZodType } from 'zod'

import { defineMountedButton } from '@/addon/api'
import type {
  MountedAddonButtonDefinition,
  MountedAddonButtonRenderProps,
} from '@/addon/api'

export const PAGE_NAV_META = 'page-nav'
const DEFAULT_KEY_COUNT = 15
const PAGE_DECK_SUFFIX_PATTERN = /-p\d+$/

export interface PageNavButtonConfig {
  currentPage: number
  label: string
  meta: typeof PAGE_NAV_META
  position: number
  target_deck: string
  target_deck_double_tap: string
  totalPages: number
  type: 'change-deck'
}

export interface PagedCategoryButtonOptions<TConfig> {
  configSchema: ZodType<TConfig>
  getTargetDeckId: (config: TConfig) => string
  render: (props: MountedAddonButtonRenderProps<TConfig>) => ReactElement
  type: string
}

export interface PaginateDecksPage {
  deckId: string
  endIndex: number
  pageNumber: number
  startIndex: number
}

export interface PaginateDecksOptions {
  baseDeckId: string
  pageSize: number
  totalItems: number
}

function deriveCurrentDeckId(
  currentPage: number,
  prevDeckId: string | null,
  nextDeckId: string | null,
): string | null {
  const neighbor = nextDeckId ?? prevDeckId
  if (!neighbor) return null
  return neighbor.replace(PAGE_DECK_SUFFIX_PATTERN, `-p${currentPage}`)
}

export function buildPageNavButton(
  currentPage: number,
  totalPages: number,
  prevDeckId: string | null,
  nextDeckId: string | null,
  options?: { keyCount?: number },
): PageNavButtonConfig {
  const keyCount = options?.keyCount ?? DEFAULT_KEY_COUNT
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  const currentDeckId = deriveCurrentDeckId(currentPage, prevDeckId, nextDeckId)

  const tapTarget = isLastPage
    ? (currentDeckId ?? prevDeckId ?? '')
    : (nextDeckId ?? prevDeckId ?? '')
  const doubleTapTarget = isFirstPage
    ? (currentDeckId ?? nextDeckId ?? '')
    : (prevDeckId ?? nextDeckId ?? '')

  return {
    currentPage,
    label: 'Page',
    meta: PAGE_NAV_META,
    position: keyCount - 2,
    target_deck: tapTarget,
    target_deck_double_tap: doubleTapTarget,
    totalPages,
    type: 'change-deck',
  }
}

export function definePagedCategoryButton<TConfig>(
  options: PagedCategoryButtonOptions<TConfig>,
): MountedAddonButtonDefinition<TConfig> {
  return defineMountedButton<TConfig>({
    configSchema: options.configSchema,
    onTap: async ({ config, methods }) => {
      await methods.navigateToDeck(options.getTargetDeckId(config), {
        addToHistory: true,
      })
    },
    render: options.render,
    type: options.type,
  })
}

export function paginateDecks(
  options: PaginateDecksOptions,
): PaginateDecksPage[] {
  const { baseDeckId, pageSize, totalItems } = options
  if (totalItems <= 0 || pageSize <= 0) return []

  const pages: PaginateDecksPage[] = []
  for (let index = 0; index < totalItems; index += pageSize) {
    const pageNumber = pages.length + 1
    const startIndex = index
    const endIndex = Math.min(index + pageSize - 1, totalItems - 1)
    pages.push({
      deckId: `${baseDeckId}-p${pageNumber}`,
      endIndex,
      pageNumber,
      startIndex,
    })
  }
  return pages
}
