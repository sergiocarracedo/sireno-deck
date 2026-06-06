import { z } from 'zod'

import { Icon, Text } from '../../../ui/index.js'
import { defineMountedButton } from '../../../addon/api.js'

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
        <div className="absolute top-1 left-1 text-[10px] opacity-70">Tap</div>
      )}
      <Icon icon="chevron-right" size={20} />
      {doubleTapNoop ? null : (
        <div className="absolute bottom-1 right-1 text-[10px] opacity-70">Dbl Tap</div>
      )}
    </div>
  )
}

const DOUBLE_TAP_WINDOW_MS = 300
const NAVIGATE_BUTTON = '__sireno_navigate__'

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
  onTap: async ({ config, methods, store }) => {
    const previousTapAt = (store.button.snapshot as { tapAt?: number } | null)
      ?.tapAt
    const now = Date.now()
    const isDoubleTap =
      typeof previousTapAt === 'number' &&
      now - previousTapAt < DOUBLE_TAP_WINDOW_MS

    store.button.set({ tapAt: now })

    if (isDoubleTap && config.target_deck_double_tap) {
      await methods.navigateToDeck(config.target_deck_double_tap)
      return
    }

    if (
      !isDoubleTap &&
      config.target_deck_double_tap &&
      config.target_deck === config.target_deck_double_tap
    ) {
      return
    }

    await methods.navigateToDeck(config.target_deck)
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
