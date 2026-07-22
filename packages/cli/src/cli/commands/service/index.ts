import type { CommandModule } from "yargs"

import { serviceRunCommand } from "./run"
import { serviceStatusCommand } from "./status"
import { stopCommand } from "./stop"
import { restartCommand } from "./restart"
import { reloadCommand } from "./reload"
import { updateConfigCommand } from "./update-config"
import { installCommand } from "./install"

export const serviceCommands = [
  serviceRunCommand,
  serviceStatusCommand,
  stopCommand,
  restartCommand,
  reloadCommand,
  updateConfigCommand,
  installCommand,
] as CommandModule[]

export { serviceRun } from "./run"
export { serviceStatus } from "./status"
export { stopService } from "./stop"
export { restart } from "./restart"
export { reload } from "./reload"
export { updateConfig } from "./update-config"
export { installService } from "./install"
