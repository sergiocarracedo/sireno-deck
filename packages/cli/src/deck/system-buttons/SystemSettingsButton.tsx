import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { MainLabelSurface } from '@/ui/surfaces/MainLabelSurface'

export function SystemSettingsButton(): ReactElement {
  return (
    <ButtonSurface>
      <MainLabelSurface
        main={{
          name: 'settings',
        }}
        label="Settings"
      ></MainLabelSurface>
    </ButtonSurface>
  )
}
