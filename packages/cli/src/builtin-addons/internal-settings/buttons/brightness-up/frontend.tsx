import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

const BrightnessUpButtonFrontend: AddonFrontendButton<unknown> = () => (
  <IconLabelSurface label="Bright +" source="icon://sun" />
)

export default BrightnessUpButtonFrontend
