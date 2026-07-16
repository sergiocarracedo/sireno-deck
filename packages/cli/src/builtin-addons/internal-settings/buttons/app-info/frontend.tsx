import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

import pkg from "../../../../../package.json" with { type: "json" }

const version: string =
  typeof pkg.version === "string" ? pkg.version : "0.0.0"

const AppInfoButtonFrontend: AddonFrontendButton<unknown> = () => (
  <IconLabelSurface
    source="icon://info"
    label={`Sireno v${version}`}
    details="App Info"
  />
)

export default AppInfoButtonFrontend
