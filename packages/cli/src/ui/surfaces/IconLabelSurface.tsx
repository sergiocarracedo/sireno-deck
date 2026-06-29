import { type HTMLAttributes, type ReactElement } from 'react'

import { Icon, IconProps } from '../primitives/Icon.tsx'
import { Label } from '../primitives/Label.tsx'
import { useThemeUiPresentation } from '../theme-presentation.tsx'

export interface IconLabelSurfaceProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  icon?: IconProps
  label: string
}

export function IconLabelSurface(props: IconLabelSurfaceProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.iconLabel) {
    return themeUi.surfaces.iconLabel(props)
  }

  const { className: consumerClassName, ...rest } = props
  const layoutClassName = 'flex flex-col items-center justify-center gap-1'
  const mergedClassName = consumerClassName
    ? `${layoutClassName} ${consumerClassName}`
    : layoutClassName

  return (
    <div className={mergedClassName} {...rest}>
      <Icon {...props.icon} size={30} />
      <Label>{props.label}</Label>
    </div>
  )
}
