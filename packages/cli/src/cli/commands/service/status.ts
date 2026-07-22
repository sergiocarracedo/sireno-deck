import {
  checkStatus,
  readConfigPath,
  readPid,
  readChildren,
  type CheckStatusOptions,
} from "@/util/daemon"
import type { CommandModule } from "yargs"

export interface ServiceStatusOptions {
  readonly logger: import("pino").Logger
}

export const serviceStatus = async (
  options: ServiceStatusOptions,
): Promise<void> => {
  const { logger } = options
  await new Promise<void>((resolve) => {
    checkStatus({ logger } as CheckStatusOptions)
    resolve()
  })
  const configPath = readConfigPath()
  if (configPath) {
    logger.info({ configPath }, "service: configured config path")
  }
  const children = readChildren()
  if (children && children.pids.length > 0) {
    logger.info({ children: children.pids }, "service: tracked children")
  }
}

interface ServiceStatusArgs {}

export const serviceStatusCommand: CommandModule<object, ServiceStatusArgs> = {
  command: "status",
  describe: "Check service status",
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await serviceStatus({ logger })
  },
}
