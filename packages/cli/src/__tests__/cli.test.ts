import { describe, expect, it } from "vitest"

import { PROTOCOL_VERSION, SIRENO_ADDON_API_VERSION, cliVersion } from "@/index"
import { createLogger } from "@/util/logger"
import {
  checkStatus,
  isRunning,
  readPid,
  removePidFile,
  resolveDaemonPaths,
  writePid,
} from "@/util/daemon"

describe("package constants", () => {
  it("exposes the addon API version 3", () => {
    expect(SIRENO_ADDON_API_VERSION).toBe(3)
  })

  it("exposes the WS protocol version 3", () => {
    expect(PROTOCOL_VERSION).toBe(3)
  })

  it("exposes a semver cli version", () => {
    expect(cliVersion).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe("logger", () => {
  it("creates a logger with the sireno-deck name", () => {
    const logger = createLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
  })

  it("respects verbose flag for level", () => {
    const logger = createLogger({ verbose: true })
    expect(logger.level).toBe("debug")
  })
})

describe("daemon pid file", () => {
  it("resolves daemon paths to a writable directory", () => {
    const paths = resolveDaemonPaths()
    expect(paths.runtimeDir).toBeTruthy()
    expect(paths.pidFile).toMatch(/sireno-deck\.pid$/)
  })

  it("writes and reads a pid", () => {
    const paths = resolveDaemonPaths()
    writePid(12345, paths)
    expect(readPid(paths)).toBe(12345)
    expect(isRunning(12345)).toBe(false)
  })

  it("runs checkStatus without throwing when no pid is present", () => {
    const paths = resolveDaemonPaths()
    removePidFile(paths)
    const logger = createLogger({ level: "silent" })
    expect(() => checkStatus({ logger })).not.toThrow()
  })
})
