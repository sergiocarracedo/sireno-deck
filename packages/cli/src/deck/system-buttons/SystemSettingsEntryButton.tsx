import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { IconLabelSurface } from '@/ui/surfaces/IconLabelSurface'

export function SystemSettingsEntryButton(): ReactElement {
  return (
    <ButtonSurface>
      <IconLabelSurface
        icon={{
          name: 'settings',
        }}
        label="Settings"
      ></IconLabelSurface>
    </ButtonSurface>
  )
}
