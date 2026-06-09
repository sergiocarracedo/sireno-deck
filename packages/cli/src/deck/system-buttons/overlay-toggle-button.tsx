import { ButtonSurface } from '@/addon/api'
import { Icon, Text } from '@/ui/index'

import type { ReactElement } from 'react'

export function OverlayToggleButton(): ReactElement {
  return (
    <ButtonSurface full>
      <button
        type="button"
        className="flex h-full w-full flex-col items-center justify-center gap-0.5"
        data-sireno-overlay-toggle="true"
      >
        <Icon name="chevron-down" size={32} />
        <Text size="xs" tone="foreground">
          Base
        </Text>
      </button>
    </ButtonSurface>
  )
}
