import sharp from "sharp"

import { STREAM_DECK_KEY_PRESET, type TextImagePreset } from "./text-image.js"

export interface BrowserPageLike {
  close?: () => Promise<void>
  screenshot: (options?: { fullPage?: boolean }) => Promise<Buffer>
  setContent: (html: string) => Promise<void>
  setViewportSize?: (size: { height: number; width: number }) => Promise<void>
}

export interface BrowserContextLike {
  close: () => Promise<void>
  newPage: () => Promise<BrowserPageLike>
}

export interface BrowserLike {
  close: () => Promise<void>
  newContext: () => Promise<BrowserContextLike>
}

export interface BrowserLauncher {
  launch: (options?: Record<string, unknown>) => Promise<BrowserLike>
}

export interface BrowserRendererLayout {
  columns: number
  keyCount: number
  rows: number
}

export interface BrowserRendererOptions {
  keyCount: number
  launcher?: BrowserLauncher
  launchOptions?: Record<string, unknown>
  preset?: TextImagePreset
}

export interface BrowserRenderer {
  captureKeyBuffers: () => Promise<Map<number, Buffer>>
  close: () => Promise<void>
  start: () => Promise<void>
  updateDeck: (html: string) => Promise<void>
}

interface CaptureWaiter {
  reject: (reason?: unknown) => void
  requestedVersion: number
  resolve: (buffers: Map<number, Buffer>) => void
}

async function loadPlaywrightLauncher(): Promise<BrowserLauncher> {
  const playwrightModule = await import("playwright")
  return playwrightModule.chromium as BrowserLauncher
}

export function resolveDeckLayout(keyCount: number): BrowserRendererLayout {
  switch (keyCount) {
    case 1:
      return { columns: 1, keyCount, rows: 1 }
    case 2:
      return { columns: 2, keyCount, rows: 1 }
    case 3:
      return { columns: 3, keyCount, rows: 1 }
    case 6:
      return { columns: 3, keyCount, rows: 2 }
    case 8:
      return { columns: 4, keyCount, rows: 2 }
    case 15:
      return { columns: 5, keyCount, rows: 3 }
    case 32:
      return { columns: 8, keyCount, rows: 4 }
    default: {
      const columns = Math.max(1, Math.ceil(Math.sqrt(keyCount)))
      const rows = Math.max(1, Math.ceil(keyCount / columns))
      return { columns, keyCount, rows }
    }
  }
}

function getDeckPixelSize(layout: BrowserRendererLayout, preset: TextImagePreset): { height: number; width: number } {
  return {
    height: layout.rows * preset.keyHeight,
    width: layout.columns * preset.keyWidth,
  }
}

async function cropDeckCaptureToKeyBuffers(
  capture: Buffer,
  layout: BrowserRendererLayout,
  preset: TextImagePreset,
): Promise<Map<number, Buffer>> {
  const keyBuffers = new Map<number, Buffer>()

  for (let keyIndex = 0; keyIndex < layout.keyCount; keyIndex += 1) {
    const row = Math.floor(keyIndex / layout.columns)
    const column = keyIndex % layout.columns
    const buffer = await sharp(capture)
      .extract({
        height: preset.keyHeight,
        left: column * preset.keyWidth,
        top: row * preset.keyHeight,
        width: preset.keyWidth,
      })
      .removeAlpha()
      .raw()
      .toBuffer()

    keyBuffers.set(keyIndex, buffer)
  }

  return keyBuffers
}

function parseMediaSampleIntervalMs(html: string): number | undefined {
  const match = html.match(/data-sireno-media-sample-interval-ms="(\d+)"/)
  if (!match) {
    return undefined
  }

  return Number.parseInt(match[1] ?? "", 10)
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function createBrowserRenderer(options: BrowserRendererOptions): BrowserRenderer {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const viewport = getDeckPixelSize(layout, preset)
  const launchOptions = options.launchOptions ?? {
    headless: true,
  }

  let browser: BrowserLike | null = null
  let context: BrowserContextLike | null = null
  let page: BrowserPageLike | null = null
  let latestHtml = ""
  let latestMediaSampleIntervalMs: number | undefined
  let latestVersion = 0
  let renderedVersion = 0
  let lastCapturedBuffers = new Map<number, Buffer>()
  let lastCaptureAt = 0
  let captureLoopPromise: Promise<void> | null = null
  const captureWaiters: CaptureWaiter[] = []

  async function ensurePage(): Promise<BrowserPageLike> {
    if (page) {
      return page
    }

    const launcher = options.launcher ?? await loadPlaywrightLauncher()
    browser = await launcher.launch(launchOptions)
    context = await browser.newContext()
    page = await context.newPage()
    await page.setViewportSize?.(viewport)

    return page
  }

  function resolveCaptureWaiters(): void {
    const readyWaiters = captureWaiters.filter((waiter) => waiter.requestedVersion <= renderedVersion)
    if (readyWaiters.length === 0) {
      return
    }

    for (const waiter of readyWaiters) {
      waiter.resolve(lastCapturedBuffers)
    }

    for (let index = captureWaiters.length - 1; index >= 0; index -= 1) {
      if (captureWaiters[index]?.requestedVersion <= renderedVersion) {
        captureWaiters.splice(index, 1)
      }
    }
  }

  function rejectCaptureWaiters(error: unknown): void {
    const waiters = captureWaiters.splice(0, captureWaiters.length)
    for (const waiter of waiters) {
      waiter.reject(error)
    }
  }

  async function runCaptureLoop(): Promise<void> {
    try {
      while (renderedVersion < latestVersion) {
        const requestedVersion = latestVersion
        const requestedHtml = latestHtml
        const requestedSampleIntervalMs = latestMediaSampleIntervalMs

        if (renderedVersion > 0 && requestedSampleIntervalMs !== undefined) {
          const waitMs = Math.max(0, lastCaptureAt + requestedSampleIntervalMs - Date.now())
          await sleep(waitMs)

          if (requestedVersion !== latestVersion) {
            continue
          }
        }

        const activePage = await ensurePage()

        await activePage.setContent(requestedHtml)
        const capture = await activePage.screenshot({ fullPage: true })

        if (requestedVersion !== latestVersion) {
          continue
        }

        lastCapturedBuffers = await cropDeckCaptureToKeyBuffers(capture, layout, preset)
        lastCaptureAt = Date.now()
        renderedVersion = requestedVersion
        resolveCaptureWaiters()
      }
    } catch (error) {
      rejectCaptureWaiters(error)
      throw error
    } finally {
      captureLoopPromise = null
    }
  }

  function ensureCaptureLoop(): Promise<void> {
    if (!captureLoopPromise) {
      captureLoopPromise = runCaptureLoop()
    }

    return captureLoopPromise
  }

  return {
    async start() {
      await ensurePage()
    },
    async updateDeck(html) {
      latestHtml = html
      latestMediaSampleIntervalMs = parseMediaSampleIntervalMs(html)
      latestVersion += 1
    },
    async captureKeyBuffers() {
      if (latestVersion === 0) {
        return lastCapturedBuffers
      }

      if (renderedVersion >= latestVersion) {
        return lastCapturedBuffers
      }

      const requestedVersion = latestVersion

      return new Promise<Map<number, Buffer>>((resolve, reject) => {
        captureWaiters.push({ reject, requestedVersion, resolve })
        void ensureCaptureLoop().catch(() => {})
      })
    },
    async close() {
      try {
        await captureLoopPromise
      } catch {
        // Ignore prior capture failures during shutdown; callers already saw them.
      }

      await page?.close?.()
      page = null

      await context?.close()
      context = null

      await browser?.close()
      browser = null
    },
  }
}
