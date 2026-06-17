import { type ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import type { DeckConfig } from '@/core/schemas'
import { Icon } from '@/ui'
import { iconConfigToProps } from '@/ui/Icon'
import { Label } from '@/ui/Label'

interface OverlayToggleButtonProps {
  activeOverlayDeck: DeckConfig | null
}

const EMOJI_FIRST_CHAR_REGEX = /^\p{Extended_Pictographic}/u

function extractFirstEmoji(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(EMOJI_FIRST_CHAR_REGEX)
  return match ? match[0] : null
}

function extractNameInitial(value: string | undefined): string | null {
  if (!value) return null
  const first = value.charAt(0)
  return first ? first.toUpperCase() : null
}

export function OverlayToggleButton(
  props: OverlayToggleButtonProps,
): ReactElement {
  const { activeOverlayDeck } = props
  const deckName = activeOverlayDeck?.name ?? activeOverlayDeck?.id
  const badgeEmoji = deckName ? extractFirstEmoji(deckName) : null
  const nameInitial = deckName ? extractNameInitial(deckName) : null
  const badgeIconSpec = activeOverlayDeck?.icon
    ? iconConfigToProps(activeOverlayDeck.icon, { size: 10 })
    : null
  const label = deckName ?? 'Show App'

  return (
    <ButtonSurface>
      <div
        className="flex flex-col items-center justify-center gap-1"
        data-sireno-overlay-toggle="true"
      >
        <div className="relative inline-flex">
          <Icon name="send-to-back" size={30} />
          {activeOverlayDeck !== null ? (
            <span
              data-testid="sireno-overlay-badge"
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background leading-none"
            >
              {badgeIconSpec !== null ? (
                <Icon {...badgeIconSpec} />
              ) : badgeEmoji !== null ? (
                <span className="text-[12px]">{badgeEmoji}</span>
              ) : nameInitial !== null ? (
                <span className="text-[12px]">{nameInitial}</span>
              ) : (
                <Icon name="layout-grid" size={10} />
              )}
            </span>
          ) : null}
        </div>
        <Label>{label}</Label>
      </div>
    </ButtonSurface>
  )
}
