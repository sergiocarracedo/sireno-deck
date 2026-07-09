import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

const BrightnessUpButtonFrontend: AddonFrontendButton<unknown> = () => (
  <IconLabelSurface label="Bright +" icon={{ name: "sun" }} />
)

export default BrightnessUpButtonFrontend
