import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { MainLabelSurface } from '@/ui'

interface SystemBackButtonProps {
  backIconOverride?: string
}

export function SystemBackButton(props: SystemBackButtonProps): ReactElement {
  const { backIconOverride } = props
  return (
    <ButtonSurface>
      <MainLabelSurface
        main={{
          name: backIconOverride ?? 'undo2',
        }}
        label="Back"
      ></MainLabelSurface>
    </ButtonSurface>
  )
}
