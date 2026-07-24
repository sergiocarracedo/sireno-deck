import type { AddonFrontendButton } from "@/addon/api"
import { Icon, Text } from "@/ui/index"

import pkg from "../../../../../package.json" with { type: "json" }
import type { ConfigSchema } from "./config"

const version: string = typeof pkg.version === "string" ? pkg.version : "0.0.0"

const AppInfoButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => (
  <div className="flex h-full w-full items-center justify-center gap-1 flex-col">
    <Icon source={config.icon} size={40} />
    <Text text={version} />
  </div>
)

export default AppInfoButtonFrontend
