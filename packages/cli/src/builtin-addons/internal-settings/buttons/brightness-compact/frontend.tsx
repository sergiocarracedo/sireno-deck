import type { AddonFrontendButton } from "@/addon/api"
import { BrightnessButtonFrontend } from "../brightness/common/frontend"

export const CompactBrightnessFrontend: AddonFrontendButton<unknown> = ({
  gesture,
}) => <BrightnessButtonFrontend variant="compact" gesture={gesture ?? null} />
