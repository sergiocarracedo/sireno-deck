import { type ReactElement, type ReactNode } from 'react'

import { Text } from './Text'
import { useThemeUiPresentation } from '../theme-presentation'

export interface LabelProps {
  children: ReactNode
}

export function Label(props: LabelProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.label) {
    return themeUi.label(props)
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
