import { describe, expect, it } from "vitest"

import { buildLogger } from "../index"

describe("buildLogger", () => {
  it("defaults to error level when no flags are given", () => {
    const logger = buildLogger({})
    expect(logger.level).toBe("error")
  })

  it("uses info level in dev mode", () => {
    const logger = buildLogger({ devMode: true })
    expect(logger.level).toBe("info")
  })

  it("uses debug level when verbose", () => {
    const logger = buildLogger({ verbose: true })
    expect(logger.level).toBe("debug")
  })

  it("lets explicit log level override defaults", () => {
    const logger = buildLogger({ logLevel: "warn" })
    expect(logger.level).toBe("warn")
  })

  it("lets explicit log level override verbose and dev mode", () => {
    const logger = buildLogger({
      logLevel: "fatal",
      verbose: true,
      devMode: true,
    })
    expect(logger.level).toBe("fatal")
  })

  it("prefers verbose over dev mode", () => {
    const logger = buildLogger({ verbose: true, devMode: true })
    expect(logger.level).toBe("debug")
  })

  it("uses silent level when --quiet", () => {
    const logger = buildLogger({ quiet: true })
    expect(logger.level).toBe("silent")
  })

  it("normalizes --log-level none to silent", () => {
    const logger = buildLogger({ logLevel: "none" })
    expect(logger.level).toBe("silent")
  })

  it("respects --log-level silent", () => {
    const logger = buildLogger({ logLevel: "silent" })
    expect(logger.level).toBe("silent")
  })
})
