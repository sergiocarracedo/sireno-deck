import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:os", () => ({ homedir: () => "/tmp/test-home" }))
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

import { existsSync } from "node:fs"

import {
  isChromiumInstalled,
  isChromiumInstallSkipped,
} from "./chromium-detect"

describe("isChromiumInstallSkipped", () => {
  beforeEach(() => {
    delete process.env.SIRENO_SKIP_BROWSER_INSTALL
  })
  afterEach(() => {
    delete process.env.SIRENO_SKIP_BROWSER_INSTALL
  })

  it("returns false when env var is not set", () => {
    expect(isChromiumInstallSkipped()).toBe(false)
  })

  it("returns true when env var is 1", () => {
    process.env.SIRENO_SKIP_BROWSER_INSTALL = "1"
    expect(isChromiumInstallSkipped()).toBe(true)
  })
})

describe("isChromiumInstalled", () => {
  it("returns false when both cache and marker missing", () => {
    vi.mocked(existsSync).mockReturnValue(false)
    expect(isChromiumInstalled()).toBe(false)
  })

  it("returns true when both cache and marker exist", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    expect(isChromiumInstalled()).toBe(true)
  })

  it("returns false when only cache exists", () => {
    vi.mocked(existsSync).mockImplementation(
      (p) => !String(p).endsWith("chromium-installed"),
    )
    expect(isChromiumInstalled()).toBe(false)
  })
})
