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
    expect(setContent).toHaveBeenCalledTimes(2)
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
    const buffers = await renderer.captureKeyBuffers()

    expect(buffers.size).toBe(3)
    expect(buffers.get(0)?.length).toBe(72 * 72 * 3)
    expect(buffers.get(0)?.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]))
    expect(buffers.get(1)?.subarray(0, 3)).toEqual(Buffer.from([0, 255, 0]))
    expect(buffers.get(2)?.subarray(0, 3)).toEqual(Buffer.from([0, 0, 255]))
  })
})
