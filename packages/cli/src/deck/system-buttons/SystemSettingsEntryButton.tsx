import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { Icon, Label } from '@/ui/index'

export function SystemSettingsEntryButton(): ReactElement {
  return (
    <ButtonSurface>
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative inline-flex items-center justify-center">
          <Icon name="settings" size={24} />
        </div>
        <Label>Settings</Label>
      </div>
    </ButtonSurface>
  )
}
