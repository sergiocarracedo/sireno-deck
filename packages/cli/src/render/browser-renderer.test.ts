import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

import { createBrowserRenderer } from './browser-renderer.js'

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
      background: '#000000',
      channels: 4,
      height: 72,
      width: colors.length * 72,
    },
  }).composite(overlays).png().toBuffer()
}

describe('browser renderer', () => {
  it('keeps one persistent page alive across updates', async () => {
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(async () => createDeckScreenshot(['#ff0000']))
    const newPage = vi.fn(async () => ({ screenshot, setContent, setViewportSize: vi.fn() }))
    const newContext = vi.fn(async () => ({ close: vi.fn(), newPage }))
    const launch = vi.fn(async () => ({ close: vi.fn(), newContext }))
    const renderer = createBrowserRenderer({ keyCount: 1, launcher: { launch } })

    await renderer.start()
    await renderer.updateDeck('<html><body>one</body></html>')
    await renderer.updateDeck('<html><body>two</body></html>')

    expect(launch).toHaveBeenCalledTimes(1)
    expect(newContext).toHaveBeenCalledTimes(1)
    expect(newPage).toHaveBeenCalledTimes(1)
    expect(setContent).toHaveBeenCalledTimes(0)
  })

  it('captures a full deck screenshot and returns cropped per-key buffers', async () => {
    const renderer = createBrowserRenderer({
      keyCount: 3,
      launcher: {
        launch: async () => ({
          close: async () => {},
          newContext: async () => ({
            close: async () => {},
            newPage: async () => ({
              screenshot: async () => createDeckScreenshot(['#ff0000', '#00ff00', '#0000ff']),
              setContent: async () => {},
              setViewportSize: async () => {},
            }),
          }),
        }),
      },
    })

    await renderer.start()
    await renderer.updateDeck('<html><body>rgb</body></html>')
    const buffers = await renderer.captureKeyBuffers()

    expect(buffers.size).toBe(3)
    expect(buffers.get(0)?.length).toBe(72 * 72 * 3)
    expect(buffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(buffers.get(1)?.subarray(0, 3)).toEqual(Buffer.from([0, 255, 0]))
    expect(buffers.get(2)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
  })

  it('drops stale intermediate deck states and captures only the latest pending update', async () => {
    let screenshotIndex = 0
    let releaseFirstCapture: (() => void) | undefined
    const setContent = vi.fn(async () => {})
    const screenshot = vi.fn(() => new Promise<Buffer>((resolve) => {
      screenshotIndex += 1

      if (screenshotIndex === 1) {
        releaseFirstCapture = () => {
          void createDeckScreenshot(['#ff0000']).then(resolve)
        }
        return
      }

      void createDeckScreenshot(['#0000ff']).then(resolve)
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
    await renderer.updateDeck('<html><body>one</body></html>')
    const firstCapturePromise = renderer.captureKeyBuffers()
    await vi.waitFor(() => {
      expect(screenshot).toHaveBeenCalledTimes(1)
    })

    await renderer.updateDeck('<html><body>two</body></html>')
    await renderer.updateDeck('<html><body>three</body></html>')
    const latestCapturePromise = renderer.captureKeyBuffers()

    releaseFirstCapture?.()

    const [firstBuffers, latestBuffers] = await Promise.all([firstCapturePromise, latestCapturePromise])

    expect(setContent.mock.calls.map((call) => call[0])).toEqual([
      '<html><body>one</body></html>',
      '<html><body>three</body></html>',
    ])
    expect(screenshot).toHaveBeenCalledTimes(2)
    expect(firstBuffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
    expect(latestBuffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
  })

  it('throttles sampled media captures while still coalescing to the latest HTML state', async () => {
    vi.useFakeTimers()

    try {
      const setContent = vi.fn(async () => {})
      const screenshot = vi
        .fn<() => Promise<Buffer>>()
        .mockImplementationOnce(async () => createDeckScreenshot(['#ff0000']))
        .mockImplementationOnce(async () => createDeckScreenshot(['#0000ff']))
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
      await renderer.updateDeck('<html><body><div id="deck-root" data-sireno-media-sample-interval-ms="200"></div></body></html>')
      await renderer.captureKeyBuffers()

      expect(screenshot).toHaveBeenCalledTimes(1)

      await renderer.updateDeck('<html><body><div id="deck-root" data-sireno-media-sample-interval-ms="200">two</div></body></html>')
      const latestCapturePromise = renderer.captureKeyBuffers()
      await renderer.updateDeck('<html><body><div id="deck-root" data-sireno-media-sample-interval-ms="200">three</div></body></html>')

      await vi.advanceTimersByTimeAsync(199)
      expect(screenshot).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1)
      const latestBuffers = await latestCapturePromise

      expect(setContent.mock.calls.map((call) => call[0])).toEqual([
        '<html><body><div id="deck-root" data-sireno-media-sample-interval-ms="200"></div></body></html>',
        '<html><body><div id="deck-root" data-sireno-media-sample-interval-ms="200">three</div></body></html>',
      ])
      expect(screenshot).toHaveBeenCalledTimes(2)
      expect(latestBuffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses the lowest sampled media interval across the active deck instead of the first declared one', async () => {
    vi.useFakeTimers()

    try {
      const setContent = vi.fn(async () => {})
      const screenshot = vi
        .fn<() => Promise<Buffer>>()
        .mockImplementationOnce(async () => createDeckScreenshot(['#ff0000']))
        .mockImplementationOnce(async () => createDeckScreenshot(['#0000ff']))
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
      await renderer.updateDeck('<html><body><div id="deck-root"><div data-sireno-media-sample-interval-ms="400"></div><div data-sireno-media-sample-interval-ms="200"></div></div></body></html>')
      await renderer.captureKeyBuffers()

      await renderer.updateDeck('<html><body><div id="deck-root"><div data-sireno-media-sample-interval-ms="400">two</div><div data-sireno-media-sample-interval-ms="200">two</div></div></body></html>')
      const latestCapturePromise = renderer.captureKeyBuffers()

      await vi.advanceTimersByTimeAsync(199)
      expect(screenshot).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1)
      await latestCapturePromise

      expect(setContent.mock.calls.map((call) => call[0])).toEqual([
        '<html><body><div id="deck-root"><div data-sireno-media-sample-interval-ms="400"></div><div data-sireno-media-sample-interval-ms="200"></div></div></body></html>',
        '<html><body><div id="deck-root"><div data-sireno-media-sample-interval-ms="400">two</div><div data-sireno-media-sample-interval-ms="200">two</div></div></body></html>',
      ])
      expect(screenshot).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
