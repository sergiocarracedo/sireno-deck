import sharp from "sharp"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { pathToFileURL } from "node:url"
import { createElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createBrowserRenderer,
  getVirtualDeckDevices,
  LIVE_HARDWARE_CAPTURE_INTERVAL_MS,
  MAX_MEDIA_SAMPLE_INTERVAL_MS,
  MIN_MEDIA_SAMPLE_INTERVAL_MS,
} from "./browser-renderer.js"
import { renderDomDeck } from "./dom-host.js"

async function createDeckScreenshot(colors: string[]): Promise<Buffer> {
  const overlays = colors.map((color, index) => ({
    input: {
      create: {
        background: color,
        channels: 4,
        height: 72,
        width: 72,
      },
    },
    left: index * 72,
    top: 0,
  }))

  return sharp({
    create: {
      background: "#000000",
      channels: 4,
      height: 72,
      width: colors.length * 72,
    },
  }).composite(overlays).png().toBuffer()
}

async function createGridDeckScreenshot(colors: string[], columns: number): Promise<Buffer> {
  const overlays = colors.map((color, index) => ({
    input: {
      create: {
        background: color,
        channels: 4,
        height: 72,
        width: 72,
      },
    },
    left: (index % columns) * 72,
    top: Math.floor(index / columns) * 72,
  }))
  const rows = Math.ceil(colors.length / columns)

  return sharp({
    create: {
      background: "#000000",
      channels: 4,
      height: rows * 72,
      width: columns * 72,
    },
  }).composite(overlays).png().toBuffer()
}

describe("browser renderer", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps one persistent page alive across updates", async () => {
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createDeckScreenshot(["#ff0000"]))
    const newPage = vi.fn(async () => ({ screenshot, setContent, setViewportSize: vi.fn() }))
    const newContext = vi.fn(async () => ({ close: vi.fn(), newPage }))
    const launch = vi.fn(async () => ({ close: vi.fn(), newContext }))
    const renderer = createBrowserRenderer({ keyCount: 1, launcher: { launch } })

    await renderer.start()
    await renderer.updateDeck("<html><body>one</body></html>")
    await renderer.updateDeck("<html><body>two</body></html>")

    expect(launch).toHaveBeenCalledTimes(1)
    expect(newContext).toHaveBeenCalledTimes(1)
    expect(newPage).toHaveBeenCalledTimes(1)
    expect(setContent).toHaveBeenCalledTimes(0)
  })

  it("captures a full deck screenshot and returns cropped per-key buffers", async () => {
    const renderer = createBrowserRenderer({
      keyCount: 3,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot: async () => createDeckScreenshot(["#ff0000", "#00ff00", "#0000ff"]),
              setContent: async () => {},
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck("<html><body>rgb</body></html>")
    const buffers = await renderer.captureKeyBuffers()

    expect(buffers.size).toBe(3)
    expect(buffers.get(0)?.length).toBe(72 * 72 * 3)
    expect(buffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(buffers.get(1)?.subarray(0, 3)).toEqual(Buffer.from([0, 255, 0]))
    expect(buffers.get(2)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
  })

  it("drops stale intermediate deck states and captures only the latest pending update", async () => {
    let screenshotIndex = 0
    let releaseFirstCapture: (() => void) | undefined
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(() => new Promise<Buffer>((resolve) => {
      screenshotIndex += 1

      if (screenshotIndex === 1) {
        releaseFirstCapture = () => {
          void createDeckScreenshot(["#ff0000"]).then(resolve)
        }
        return
      }

      void createDeckScreenshot(["#0000ff"]).then(resolve)
    }))
    const renderer = createBrowserRenderer({
      keyCount: 1,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot,
              setContent,
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck("<html><body>one</body></html>")
    const firstCapturePromise = renderer.captureKeyBuffers()
    await vi.waitFor(() => {
      expect(screenshot).toHaveBeenCalledTimes(1)
    })

    await renderer.updateDeck("<html><body>two</body></html>")
    await renderer.updateDeck("<html><body>three</body></html>")
    const latestCapturePromise = renderer.captureKeyBuffers()

    releaseFirstCapture?.()

    const [firstBuffers, latestBuffers] = await Promise.all([firstCapturePromise, latestCapturePromise])

    expect(setContent.mock.calls.map((call) => call[0])).toEqual([
      "<html><body>one</body></html>",
      "<html><body>three</body></html>",
    ])
    expect(screenshot).toHaveBeenCalledTimes(2)
    expect(firstBuffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
    expect(latestBuffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
  })

  it("bounds media sampling intervals before delaying the next capture", async () => {
    vi.useFakeTimers()

    let now = 0
    vi.spyOn(Date, "now").mockImplementation(() => now)
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createDeckScreenshot(["#ff0000"]))
    const renderer = createBrowserRenderer({
      keyCount: 1,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot,
              setContent,
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck(`<html><body><div data-sireno-media-sample-interval-ms="${MIN_MEDIA_SAMPLE_INTERVAL_MS - 100}"></div></body></html>`)
    await renderer.captureKeyBuffers()

    now = 1
    await renderer.updateDeck(`<html><body><div data-sireno-media-sample-interval-ms="${MAX_MEDIA_SAMPLE_INTERVAL_MS + 500}"></div></body></html>`)
    const capturePromise = renderer.captureKeyBuffers()

    await vi.advanceTimersByTimeAsync(MAX_MEDIA_SAMPLE_INTERVAL_MS - 2)
    expect(screenshot).toHaveBeenCalledTimes(1)

    now = MAX_MEDIA_SAMPLE_INTERVAL_MS + 1
    await vi.advanceTimersByTimeAsync(2)
    await capturePromise

    expect(screenshot).toHaveBeenCalledTimes(2)
    expect(setContent).toHaveBeenNthCalledWith(1, `<html><body><div data-sireno-media-sample-interval-ms="${MIN_MEDIA_SAMPLE_INTERVAL_MS - 100}"></div></body></html>`)
    expect(setContent).toHaveBeenNthCalledWith(2, `<html><body><div data-sireno-media-sample-interval-ms="${MAX_MEDIA_SAMPLE_INTERVAL_MS + 500}"></div></body></html>`)

    vi.useRealTimers()
  })

  it("keeps steady-state live hardware captures on the mounted page without rerendering unchanged html", async () => {
    vi.useFakeTimers()

    let now = 0
    vi.spyOn(Date, "now").mockImplementation(() => now)
    const frameHandler = vi.fn(async () => {})
    const setContent = vi.fn(async () => {})
    const goto = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createDeckScreenshot(["#ff0000"]))
    const renderer = createBrowserRenderer({
      frameHandler,
      keyCount: 1,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              goto,
              screenshot,
              setContent,
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
      liveHardwareMode: true,
    })

    await renderer.start()
    await renderer.updateDeck("<html><body>live</body></html>")
    await renderer.captureKeyBuffers()

    expect(goto).toHaveBeenCalledTimes(1)
    expect(screenshot).toHaveBeenCalledTimes(1)
    expect(frameHandler).toHaveBeenCalledTimes(1)
    expect(frameHandler).toHaveBeenLastCalledWith({
      buffers: expect.any(Map),
      reason: "update",
      version: 1,
    })

    now = LIVE_HARDWARE_CAPTURE_INTERVAL_MS - 1
    await vi.advanceTimersByTimeAsync(LIVE_HARDWARE_CAPTURE_INTERVAL_MS - 1)
    expect(goto).toHaveBeenCalledTimes(1)
    expect(setContent).not.toHaveBeenCalled()
    expect(screenshot).toHaveBeenCalledTimes(1)

    now = LIVE_HARDWARE_CAPTURE_INTERVAL_MS
    await vi.advanceTimersByTimeAsync(1)
    await vi.waitFor(() => {
      expect(screenshot).toHaveBeenCalledTimes(2)
    })
    await vi.waitFor(() => {
      expect(frameHandler).toHaveBeenCalledTimes(2)
    })

    expect(goto).toHaveBeenCalledTimes(1)
    expect(setContent).not.toHaveBeenCalled()
    expect(frameHandler).toHaveBeenLastCalledWith({
      buffers: expect.any(Map),
      reason: "steady-state",
      version: 1,
    })
  })

  it("does not start steady-state captures in default mode after the first capture settles", async () => {
    vi.useFakeTimers()

    let now = 0
    vi.spyOn(Date, "now").mockImplementation(() => now)
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createDeckScreenshot(["#ff0000"]))
    const renderer = createBrowserRenderer({
      keyCount: 1,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot,
              setContent,
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck("<html><body>one</body></html>")
    await renderer.captureKeyBuffers()

    now = LIVE_HARDWARE_CAPTURE_INTERVAL_MS * 2
    await vi.advanceTimersByTimeAsync(LIVE_HARDWARE_CAPTURE_INTERVAL_MS * 2)

    expect(screenshot).toHaveBeenCalledTimes(1)
    expect(setContent).toHaveBeenCalledTimes(1)
  })

  it("captures file-backed local image assets on the real browser page path", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "sireno-browser-renderer-test-"))

    try {
      const imagePath = join(tempDir, "icon.png")
      const redPng = await sharp({
        create: {
          background: "#ff0000",
          channels: 4,
          height: 24,
          width: 24,
        },
      }).png().toBuffer()
      await writeFile(imagePath, redPng)

      const setContent = vi.fn(async () => {})
      const goto = vi.fn(async () => {})
      const screenshot = vi.fn(async () => {
        const activeUrl = goto.mock.calls.at(-1)?.[0]
        const htmlPath = activeUrl ? new URL(activeUrl).pathname : undefined
        const html = htmlPath ? await readFile(htmlPath, "utf8") : ""
        const imageUrl = html.match(/src="([^"]+)"/)?.[1]

        if (!imageUrl?.startsWith("file://")) {
          return createDeckScreenshot(["#000000"])
        }

        const renderedIcon = await sharp(await readFile(new URL(imageUrl)))
          .resize(72, 72, { fit: "contain", kernel: sharp.kernel.nearest })
          .png()
          .toBuffer()

        return renderedIcon
      })
      const renderer = createBrowserRenderer({
        keyCount: 1,
        launcher: {
          launch: async () => ({
            close: async () => {},
            newContext: async () => ({
              close: async () => {},
              newPage: async () => ({
                goto,
                screenshot,
                setContent,
                setViewportSize: async () => {},
              }),
            }),
          }),
        },
      })

      await renderer.start()
      await renderer.updateDeck(`<html><body style="margin:0;background:#000;width:72px;height:72px;display:flex;align-items:center;justify-content:center;"><img src="${pathToFileURL(imagePath).href}" width="24" height="24"></body></html>`)
      const buffers = await renderer.captureKeyBuffers()

      expect(goto).toHaveBeenCalledTimes(1)
      expect(setContent).not.toHaveBeenCalled()
      expect(buffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))

      await renderer.close()
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })

  it("renders a committed emulator-sized deck through the same persistent browser page", async () => {
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createGridDeckScreenshot([
      "#ff0000", "#00ff00", "#0000ff", "#111111", "#222222",
      "#333333", "#444444", "#555555", "#666666", "#777777",
      "#888888", "#999999", "#aaaaaa", "#bbbbbb", "#cccccc",
    ], 5))
    const renderer = createBrowserRenderer({
      keyCount: 15,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot,
              setContent,
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck(renderDomDeck(Array.from({ length: 15 }, (_, keyIndex) => ({
      content: createElement("div", null, `Key ${keyIndex}`),
      keyIndex,
    })), { keyCount: 15 }))
    const buffers = await renderer.captureKeyBuffers()

    expect(setContent).toHaveBeenCalledTimes(1)
    expect(buffers.size).toBe(15)
    expect(buffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(buffers.get(14)?.subarray(0, 3)).toEqual(Buffer.from([204, 204, 204]))
  })

  it("exposes stable supported virtual device shapes for the emulator selector", () => {
    expect(getVirtualDeckDevices()).toEqual([
      { keyCount: 1, label: "Stream Deck Pedal" },
      { keyCount: 2, label: "Stream Deck Neo (2-key preview)" },
      { keyCount: 3, label: "Stream Deck Mini (row preview)" },
      { keyCount: 6, label: "Stream Deck Mini" },
      { keyCount: 8, label: "Stream Deck +" },
      { keyCount: 15, label: "Stream Deck MK.2" },
      { keyCount: 32, label: "Stream Deck XL" },
    ])
  })
})
