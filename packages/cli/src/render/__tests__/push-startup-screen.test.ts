import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import sharp from "sharp"
import { afterEach, describe, expect, it, vi } from "vitest"

import { pushStartupScreen } from "@/render/push-startup-screen"

const redLogo = (): Promise<Buffer> =>
  sharp({
    create: {
      background: { r: 255, g: 0, b: 0 },
      channels: 4,
      width: 72,
      height: 72,
    },
  })
    .png()
    .toBuffer()

describe("pushStartupScreen", () => {
  const workDir = join(tmpdir(), `push-startup-screen-${Date.now()}`)
  const logoPath = join(workDir, "logo.png")
  const logger = { info: vi.fn(), warn: vi.fn() }

  afterEach(() => vi.clearAllMocks())

  it("renders version, logo, and loading on the center row without a frontend", async () => {
    mkdirSync(workDir, { recursive: true })
    writeFileSync(logoPath, await redLogo())
    const fillKeyBuffer = vi.fn(async () => undefined)

    await pushStartupScreen({
      logoPath,
      version: "9.8.7",
      device: { getKeyCount: () => 15, fillKeyBuffer },
      logger,
    })

    const tiles = new Map(fillKeyBuffer.mock.calls)
    expect(fillKeyBuffer).toHaveBeenCalledTimes(15)
    expect(tiles.get(7)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(tiles.get(6)?.some((byte) => byte !== 0)).toBe(true)
    expect(tiles.get(8)?.some((byte) => byte !== 0)).toBe(true)
    for (let key = 0; key < 15; key += 1) {
      if ([6, 7, 8].includes(key)) continue
      expect(tiles.get(key)?.every((byte) => byte === 0)).toBe(true)
    }
    expect(logger.info).toHaveBeenCalledWith(
      { keyCount: 15, centerRow: 1, logoPosition: 7 },
      "pushStartupScreen: rendered device startup screen",
    )
  })

  it("centers the three-key group for an eight-column deck", async () => {
    writeFileSync(logoPath, await redLogo())
    const fillKeyBuffer = vi.fn(async () => undefined)

    await pushStartupScreen({
      logoPath,
      version: "9.8.7",
      device: { getKeyCount: () => 32, fillKeyBuffer },
      logger,
    })

    const tiles = new Map(fillKeyBuffer.mock.calls)
    expect(tiles.get(20)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(tiles.get(19)?.some((byte) => byte !== 0)).toBe(true)
    expect(tiles.get(21)?.some((byte) => byte !== 0)).toBe(true)
  })

  it("keeps startup non-fatal if the logo is unavailable", async () => {
    const fillKeyBuffer = vi.fn(async () => undefined)

    await expect(
      pushStartupScreen({
        logoPath: join(workDir, "missing.png"),
        version: "9.8.7",
        device: { getKeyCount: () => 15, fillKeyBuffer },
        logger,
      }),
    ).resolves.toBeUndefined()
    expect(fillKeyBuffer).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ logoPath: join(workDir, "missing.png") }),
      "pushStartupScreen: could not render startup screen",
    )
  })
})
