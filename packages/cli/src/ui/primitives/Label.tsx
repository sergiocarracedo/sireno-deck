import { type ReactElement } from "react"

import { useThemeUiPresentation } from "../theme-presentation"
import { Text } from "./Text"

export interface LabelProps {
  text: string
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
      text={props.text}
    />
  )
}