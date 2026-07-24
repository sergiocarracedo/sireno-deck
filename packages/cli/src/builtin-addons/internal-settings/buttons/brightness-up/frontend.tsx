import type { AddonFrontendButton } from "@/addon/api"
import { BrightnessButtonFrontend } from "../brightness/common/frontend"

const BrightnessUpButtonFrontend: AddonFrontendButton<unknown> = ({
  gesture,
}) => <BrightnessButtonFrontend variant="up" gesture={gesture ?? null} />

export default BrightnessUpButtonFrontend
