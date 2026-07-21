import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import sharp from "sharp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pushRawImage } from "@/render/push-raw-image"

const makeTinyPng = async (size: number): Promise<Buffer> =>
  sharp({
    create: {
      background: { r: 255, g: 0, b: 0 },
      channels: 3,
      width: size,
      height: size,
    },
  })
    .png()
    .toBuffer()

describe("pushRawImage", () => {
  let workDir: string
  let imagePath: string
  let tinyPng: Buffer

  beforeEach(async () => {
    workDir = join(tmpdir(), `push-raw-image-test-${Date.now()}-${Math.random()}`)
    mkdirSync(workDir, { recursive: true })
    tinyPng = await makeTinyPng(200)
    imagePath = join(workDir, "logo.png")
    writeFileSync(imagePath, tinyPng)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fills every key with a 72x72 raw RGB buffer when image is valid", async () => {
    const fillKeyBuffer = vi.fn<(i: number, b: Buffer) => Promise<void>>(
      async () => undefined,
    )
    const device = {
      getKeyCount: () => 15,
      fillKeyBuffer,
    }
    const logger = { warn: vi.fn(), info: vi.fn() }

    await pushRawImage({ imagePath, device: device as never, logger: logger as never })

    expect(fillKeyBuffer).toHaveBeenCalledTimes(15)
    for (const call of fillKeyBuffer.mock.calls) {
      const buf = call[1]
      expect(buf.length).toBe(72 * 72 * 3)
    }
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ imagePath, keyCount: 15 }),
      "pushRawImage: pushed raw image",
    )
  })

  it("returns without throwing when image is missing", async () => {
    const fillKeyBuffer = vi.fn<(i: number, b: Buffer) => Promise<void>>(
      async () => undefined,
    )
    const device = { getKeyCount: () => 15, fillKeyBuffer }
    const logger = { warn: vi.fn(), info: vi.fn() }

    await pushRawImage({
      imagePath: join(workDir, "does-not-exist.png"),
      device: device as never,
      logger: logger as never,
    })

    expect(fillKeyBuffer).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it("uses the default black background — edges of the buffer are zero", async () => {
    const fillKeyBuffer = vi.fn<(i: number, b: Buffer) => Promise<void>>(
      async () => undefined,
    )
    const device = { getKeyCount: () => 1, fillKeyBuffer }
    const logger = { warn: vi.fn(), info: vi.fn() }

    await pushRawImage({ imagePath, device: device as never, logger: logger as never })

    expect(fillKeyBuffer).toHaveBeenCalledTimes(1)
    const buf = fillKeyBuffer.mock.calls[0]?.[1] as Buffer
    expect(buf.length).toBe(72 * 72 * 3)
    expect(Buffer.isBuffer(buf)).toBe(true)
  })
})