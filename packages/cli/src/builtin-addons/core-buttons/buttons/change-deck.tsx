import { z } from 'zod'

import { defineMountedButton } from '@/addon/api'
import { PAGE_NAV_META } from '@/core/pagination'
import { Icon, Label, Text } from '@/ui/index'
import { resolveIconSpec } from '@/ui/Icon'

function renderCenteredButtonContent(label: string, icon?: string) {
  const spec = resolveIconSpec(icon)
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {spec ? <Icon size={24} {...spec} /> : null}
      <Text fit="wrap">{label}</Text>
    </div>
  )
}

function renderPageNavContent(
  currentPage: number,
  totalPages: number,
  isFirstPage: boolean,
  isLastPage: boolean,
) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
      <div className="flex flex-col items-center">
        <Icon name="chevron-right" size={16} />
        <Text size="xs">{isLastPage ? '—' : 'Tap'}</Text>
      </div>
      <Text size="xs" tone="muted">
        {currentPage}/{totalPages}
      </Text>
      <div className="flex flex-col items-center">
        <Icon name="chevron-right" size={16} />
        <Text size="xs">{isFirstPage ? '—' : 'Dbl Tap'}</Text>
      </div>
    </div>
  )
}

const BuiltinChangeDeckButtonSchema = z
  .object({
    currentPage: z.number().optional(),
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    meta: z.string().min(1).optional(),
    target_deck: z.string().min(1),
    target_deck_double_tap: z.string().min(1).optional(),
    totalPages: z.number().optional(),
  })
  .strict()

const builtinChangeDeckButton = defineMountedButton({
  configSchema: BuiltinChangeDeckButtonSchema,
  onTap: async ({ config, methods }) => {
    if (
      config.target_deck_double_tap &&
      config.target_deck === config.target_deck_double_tap
    ) {
      return
    }
    if (config.meta === PAGE_NAV_META) {
      await methods.navigateToDeck(config.target_deck, { addToHistory: false })
    } else {
      await methods.navigateToDeck(config.target_deck)
    }
  },
  onDblTap: async ({ config, methods }) => {
    if (!config.target_deck_double_tap) return
    if (config.meta === PAGE_NAV_META) {
      await methods.navigateToDeck(config.target_deck_double_tap, {
        addToHistory: false,
      })
    } else {
      await methods.navigateToDeck(config.target_deck_double_tap)
    }
  },
  render: ({ config }) => {
    if (config.meta === 'page-nav') {
      const currentPage = config.currentPage ?? 1
      const totalPages = config.totalPages ?? 1
      const isFirstPage = currentPage === 1
      const isLastPage = currentPage === totalPages
      return renderPageNavContent(currentPage, totalPages, isFirstPage, isLastPage)
    }
    return renderCenteredButtonContent(config.label, config.icon)
  },
  type: 'change-deck',
})

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
