import { type ReactElement } from 'react'

import { Icon, IconProps } from '../Icon'
import { Label } from '../Label'
import { useThemeUiPresentation } from '../theme-presentation'

export interface IconLabelSurfaceProps {
  icon?: IconProps
  label: string
}

export function IconLabelSurface(props: IconLabelSurfaceProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.iconLabel) {
    return themeUi.surfaces.iconLabel(props)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <Icon {...props.icon} size={30} />
      <Label>{props.label}</Label>
    </div>
  )
}
