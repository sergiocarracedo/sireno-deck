import { describe, expect, it } from "vitest"

import { buildLogger, type GlobalOptions } from "../index"
import type { ArgumentsCamelCase } from "yargs"

const opts = (o: object): ArgumentsCamelCase<GlobalOptions> =>
  o as ArgumentsCamelCase<GlobalOptions>

describe("buildLogger", () => {
  it("defaults to info level when no flags are given", () => {
    // ponytail: was `error` before the dev-detach and reload-prompt
    // changes. `info` is the lowest level that surfaces status lines,
    // runtime per-tap logs, and the SIGUSR1 reload confirmation.
    // --verbose / --log-level override the default.
    const logger = buildLogger(opts({}))
    expect(logger.level).toBe("info")
  })

  it("uses debug level when verbose", () => {
    const logger = buildLogger(opts({ verbose: true }))
    expect(logger.level).toBe("debug")
  })

  it("lets explicit log level override defaults", () => {
    const logger = buildLogger(opts({ logLevel: "warn" }))
    expect(logger.level).toBe("warn")
  })

  it("lets explicit log level override verbose", () => {
    const logger = buildLogger(
      opts({
        logLevel: "fatal",
        verbose: true,
      }),
    )
    expect(logger.level).toBe("fatal")
  })

  it("uses silent level when --quiet", () => {
    const logger = buildLogger(opts({ quiet: true }))
    expect(logger.level).toBe("silent")
  })

  it("normalizes --log-level none to silent", () => {
    const logger = buildLogger(opts({ logLevel: "none" }))
    expect(logger.level).toBe("silent")
  })

  it("respects --log-level silent", () => {
    const logger = buildLogger(opts({ logLevel: "silent" }))
    expect(logger.level).toBe("silent")
  })
})
