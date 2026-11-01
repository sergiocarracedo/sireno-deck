import type { AddonFrontendButton } from "@/addon/api"
import { Text } from "@/ui/index"
import logoUrl from "@/assets/logo72x72.png"

import pkg from "../../../../../package.json" with { type: "json" }
import type { ConfigSchema } from "./config"

const version: string = typeof pkg.version === "string" ? pkg.version : "0.0.0"

const AppInfoButtonFrontend: AddonFrontendButton<ConfigSchema> = () => (
  <div className="flex h-full w-full items-center justify-center gap-1 flex-col">
    <img src={logoUrl} width={40} height={40} alt="" />
    <Text text={version} />
  </div>
)

export default AppInfoButtonFrontend
