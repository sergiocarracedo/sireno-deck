import { type ReactElement } from 'react'

import { Icon, IconProps, iconConfigToProps } from '../Icon'
import { Label } from '../Label'
import { useThemeUiPresentation } from '../theme-presentation'

function isIconSource(value: string): boolean {
  return (
    value.includes('.svg') ||
    value.includes('.png') ||
    value.includes('.jpg') ||
    value.startsWith('addon://') ||
    value.startsWith('builtin://') ||
    value.startsWith('icon://') ||
    value.startsWith('brand://') ||
    value.startsWith('./') ||
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  )
}

export interface MainLabelSurfaceProps {
  /**
   * The visual content above the label. Can be:
   * - An icon source string (`icon://plus`, `brand://github`, `./clock.svg`, `addon://...`)
   * - An emoji char (rendered as text in the default font stack)
   * - An `IconProps` object (passed through to `<Icon>`)
   */
  main?: IconProps | string
  label: string
}

export function MainLabelSurface(props: MainLabelSurfaceProps): ReactElement {
  const themeUi = useThemeUiPresentation()
  const main = props.main
  const isString = typeof main === 'string'
  const iconProps = isString
    ? iconConfigToProps(main, { size: 30, tone: 'accent' })
    : { ...main, size: main?.size ?? 30, tone: main?.tone ?? 'accent' }

  if (themeUi?.surfaces?.iconLabel) {
    return themeUi.surfaces.iconLabel({ icon: iconProps, label: props.label })
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {isString && !isIconSource(main)
        ? <span className="text-xl leading-none">{main}</span>
        : <Icon {...iconProps} />}
      <Label>{props.label}</Label>
    </div>
  )
}
