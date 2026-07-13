import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

type Config = { icon?: string; label?: string }

const CoreActionButtonFrontend: AddonFrontendButton<Config> = ({ config }) => {
  const { icon, label } = config ?? {}
  return (
    <IconLabelSurface
      {...(icon !== undefined ? { source: icon } : {})}
      label={label ?? ""}
    />
  )
}

export default CoreActionButtonFrontend
