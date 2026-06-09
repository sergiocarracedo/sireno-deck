import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { IconLabelSurface } from '@/ui/surfaces/IconLabelSurface'
import { ButtonInstance } from '@/core/schemas'

export function SystemOverlayToggleButton(): ReactElement {
  return (
    <ButtonSurface>
      <IconLabelSurface
        icon={{
          name: 'app-window',
        }}
        label="Toggle Overlay"
      ></IconLabelSurface>
    </ButtonSurface>
  )
}


export const systemOverlayToggleButtonDefinition: ButtonInstance = {
  return {
    
  }

}