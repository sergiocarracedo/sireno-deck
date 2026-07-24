import type { AddonFrontendButton } from "@/addon/api"
import { BrightnessButtonFrontend } from "../brightness/common/frontend"

const BrightnessDownButtonFrontend: AddonFrontendButton<unknown> = ({
  gesture,
}) => <BrightnessButtonFrontend variant="down" gesture={gesture ?? null} />

export default BrightnessDownButtonFrontend
