import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { Icon, Label } from '@/ui/index'

export interface SystemSettingsEntryButtonProps {
  pendingOverlayDeck?: unknown
}

export function SystemSettingsEntryButton({
  pendingOverlayDeck: _pendingOverlayDeck,
}: SystemSettingsEntryButtonProps = {}): ReactElement {
  return (
    <ButtonSurface>
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative inline-flex items-center justify-center">
          <Icon name="settings" size={24} />
        </div>
        <Label>Settings2</Label>
      </div>
    </ButtonSurface>
  )
}
