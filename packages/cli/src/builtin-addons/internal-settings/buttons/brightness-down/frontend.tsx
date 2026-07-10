import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

const BrightnessDownButtonFrontend: AddonFrontendButton<unknown> = () => (
  <IconLabelSurface label="Bright -" source="icon://sun-dim" />
)

export default BrightnessDownButtonFrontend
