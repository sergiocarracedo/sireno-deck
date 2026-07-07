import { type ReactElement, type ReactNode } from 'react'

import { useThemeUiPresentation } from '../theme-presentation'
import { Text } from './Text'

export interface LabelProps {
  children: ReactNode
}

export function Label(props: LabelProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.label) {
    return themeUi.primitives.label(props)
  }

  return (
    <Text
      data-sireno-ui-label="true"
      size="md"
      className="uppercase leading-tight tracking-tight"
      fit="ellipsis"
      tone="primary"
      typography="main"
    >
      {props.children}
    </Text>
  )
}
