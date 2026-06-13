import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { Icon, Text } from '@/ui/index'
import type { DeckConfig } from '@/core/schemas'

const EMOJI_FIRST_CHAR_REGEX = /^\p{Extended_Pictographic}/u

function extractFirstEmoji(value: string): string | null {
  const match = value.match(EMOJI_FIRST_CHAR_REGEX)
  return match ? match[0] : null
}

export interface SystemSettingsEntryButtonProps {
  pendingOverlayDeck?: DeckConfig | null
}

export function SystemSettingsEntryButton({
  pendingOverlayDeck,
}: SystemSettingsEntryButtonProps = {}): ReactElement {
  const emoji = pendingOverlayDeck
    ? extractFirstEmoji(pendingOverlayDeck.name ?? pendingOverlayDeck.id)
    : null

  return (
    <ButtonSurface>
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative inline-flex items-center justify-center">
          <Icon name="settings" size={24} />
          {pendingOverlayDeck && (
            <span
              data-testid="sireno-overlay-badge"
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background leading-none"
            >
              {emoji ? (
                <span className="text-[12px]">{emoji}</span>
              ) : (
                <Icon name="layout-grid" size={10} />
              )}
            </span>
          )}
        </div>
        <Text size="xs">Settings</Text>
      </div>
    </ButtonSurface>
  )
}