import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { IconLabelSurface } from '@/ui'

interface SystemBackButtonProps {
  backIconOverride?: string
}

export function SystemBackButton(props: SystemBackButtonProps): ReactElement {
  const { backIconOverride } = props
  return (
    <ButtonSurface>
      <IconLabelSurface
        icon={{
          name: backIconOverride ?? 'chevron-left',
        }}
        label="Back"
      ></IconLabelSurface>
    </ButtonSurface>
  )
}
