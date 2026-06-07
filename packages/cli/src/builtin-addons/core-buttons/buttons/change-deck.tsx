import { z } from 'zod'

import { defineMountedButton } from '@/addon/api'
import { Chip, Icon, Text } from '@/ui/index'
import { PAGE_NAV_META } from '@/core/pagination'

function renderCenteredButtonContent(label: string, icon?: string) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {icon ? <Icon size={24} src={icon} /> : null}
      <Text fit="wrap">{label}</Text>
    </div>
  )
}

function renderPageNavContent(
  targetDeck: string,
  isMainDeck = false,
  tapNoop = false,
  doubleTapNoop = false,
) {
  if (isMainDeck) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <Icon icon="chevron-right" size={20} />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      {tapNoop ? null : (
        <Chip tone="muted" className="absolute top-1 left-1 text-[10px] opacity-70">
          Tap
        </Chip>
      )}
      <Icon icon="chevron-right" size={20} />
      {doubleTapNoop ? null : (
        <Chip tone="muted" className="absolute bottom-1 right-1 text-[10px] opacity-70">
          Dbl Tap
        </Chip>
      )}
    </div>
  )
}

const BuiltinChangeDeckButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    meta: z.string().min(1).optional(),
    target_deck: z.string().min(1),
    target_deck_double_tap: z.string().min(1).optional(),
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
  render: ({ config, button }) => {
    if (config.meta === 'page-nav') {
      const doubleTapTarget = config.target_deck_double_tap
      const tapNoop = config.target_deck === doubleTapTarget
      const doubleTapNoop =
        doubleTapTarget === undefined || doubleTapTarget === config.target_deck
      return renderPageNavContent(
        config.target_deck,
        button.position === 14,
        tapNoop,
        doubleTapNoop,
      )
    }
    return renderCenteredButtonContent(config.label, config.icon)
  },
  type: 'change-deck',
})

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
