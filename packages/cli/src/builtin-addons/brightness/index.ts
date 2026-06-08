import type { SirenoAddon } from "@/addon/api"
import { builtinBrightnessButton } from "./buttons/brightness"

const brightnessAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinBrightnessButton] as SirenoAddon["buttons"],
  name: "brightness",
}

export default brightnessAddon
