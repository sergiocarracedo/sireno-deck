import type { AddonFrontendButton } from "@/addon/api"
import { Icon, Text } from "@/ui/index"

import pkg from "../../../../../package.json" with { type: "json" }

const version: string =
  typeof pkg.version === "string" ? pkg.version : "0.0.0"

const AppInfoButtonFrontend: AddonFrontendButton<unknown> = () => (
  <div className="flex h-full w-full items-center justify-center gap-2">
    <Icon source="icon://info" size={32} />
    <Text text={`Sireno v${version}`} />
  </div>
)

export default AppInfoButtonFrontend
