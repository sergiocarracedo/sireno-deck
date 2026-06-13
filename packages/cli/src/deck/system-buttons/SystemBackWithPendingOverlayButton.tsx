import { type ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import type { DeckConfig } from '@/core/schemas'
import { Icon, Text } from '@/ui'

interface SystemBackWithPendingOverlayButtonProps {
  pendingOverlayDeck: DeckConfig
}

const EMOJI_FIRST_CHAR_REGEX = /^\p{Extended_Pictographic}/u

function extractFirstEmoji(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(EMOJI_FIRST_CHAR_REGEX)
  return match ? match[0] : null
}

export function SystemBackWithPendingOverlayButton(
  props: SystemBackWithPendingOverlayButtonProps,
): ReactElement {
  const { pendingOverlayDeck } = props
  const deckName = pendingOverlayDeck.name ?? pendingOverlayDeck.id
  const badgeEmoji = extractFirstEmoji(deckName)

  return (
    <ButtonSurface>
      <div
        className="flex flex-col items-center justify-center gap-0.5"
        data-sireno-system-back="2-line-pending"
      >
        <div
          data-sireno-system-back-line="1"
          className="flex items-center gap-0.5"
        >
          <Icon name="undo2" size={16} />
          <Text size="xs" tone="foreground" typography="main">
            Tap
          </Text>
        </div>
        <div
          data-sireno-system-back-line="2"
          className="flex items-center gap-0.5"
        >
          {badgeEmoji !== null ? (
            <span data-testid="sireno-pending-overlay-deck-emoji" className="text-xs leading-none">
              {badgeEmoji}
            </span>
          ) : (
            <Icon name="layout-grid" size={10} />
          )}
          <Text size="xs" tone="foreground" typography="main">
            2xTap
          </Text>
        </div>
      </div>
    </ButtonSurface>
  )
}
