import { describe, expect, it, vi } from "vitest"

const createBundledAddonRegistry = vi.fn(() => ({ bundled: true }))
const loadBootstrapConfig = vi.fn()
const loadConfig = vi.fn()
const loadConfiguredAddons = vi.fn()

vi.mock("../../config/loader.js", () => ({
  createBundledAddonRegistry,
  loadBootstrapConfig,
  loadConfig,
}))

vi.mock("../../addon/loader.js", () => ({
  loadConfiguredAddons,
}))

describe("loadRuntimeConfig", () => {
  it("logs warnings for recoverable addon load failures and keeps loading config", async () => {
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [{ enabled: true, name: "broken-addon", source: "local" }] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({
      loaded: [],
      warnings: [{ addonName: "broken-addon", reason: "broken import" }],
    })
    loadConfig.mockReturnValue({ main_deck: "main" })

    const { loadRuntimeConfig } = await import("./start.js")
    const logger = { warn: vi.fn() } as const

    const result = await loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: logger as never })

    expect(createBundledAddonRegistry).toHaveBeenCalledTimes(1)
    expect(loadConfiguredAddons).toHaveBeenCalledWith({
      addons: [{ enabled: true, name: "broken-addon", source: "local" }],
      cwd: "/tmp/project",
      registry: { bundled: true },
    })
    expect(logger.warn).toHaveBeenCalledWith(
      { addonName: "broken-addon", reason: "broken import" },
      "skipping addon after startup warning",
    )
    expect(loadConfig).toHaveBeenCalledWith("/tmp/project/config.yml", { bundled: true })
    expect(result.config).toEqual({ main_deck: "main" })
  })
})
