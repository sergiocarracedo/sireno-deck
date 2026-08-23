import type { AddonButtonTypeService } from "@/addon/api"

import { buildMacOSCommand, formatCommand, isMacOS } from "../../domain/macos"
import { configSchema, type ConfigSchema } from "./config"

export default {
  configSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ config, executor }) => {
    if (!isMacOS(process.platform)) return
    void executor.run(formatCommand(buildMacOSCommand(config))).catch(() => {})
  },
} satisfies AddonButtonTypeService<ConfigSchema>
