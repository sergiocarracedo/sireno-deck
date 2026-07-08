import type { AddonFrontendButton } from "@/addon/api";
import { IconLabelSurface } from "@/ui/index";

const BrightnessDownButtonFrontend: AddonFrontendButton<unknown> = () => (
  <IconLabelSurface label="Bright -" icon={{ name: "sun-dim" }} />
);

export default BrightnessDownButtonFrontend;
