import type { AddonFrontendButton } from '@/addon/api'
import { IconLabelSurface } from '@/ui/index'
import { iconConfigToProps } from '@/ui/primitives/Icon'

type Config = { icon?: string; label?: string }

const CoreActionButtonFrontend: AddonFrontendButton<Config> = ({ config }) => {
  const { icon, label } = config ?? {}
  return (
    <IconLabelSurface
      {...(icon !== undefined
        ? { icon: iconConfigToProps(icon, { size: 36 }) }
        : {})}
      label={label ?? ''}
    />
  )
}

export default CoreActionButtonFrontend
