import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { pathToFileURL } from "node:url"

import sharp from "sharp"

import { STREAM_DECK_KEY_PRESET, type RenderPreset } from "./render-preset.js"

export interface BrowserPageLike {
  close?: () => Promise<void>
  goto?: (url: string, options?: { waitUntil?: "domcontentloaded" | "load" | "networkidle" }) => Promise<void>
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

export interface VirtualDeckDevice {
  keyCount: number
  label: string
}

export interface BrowserRendererOptions {
  frameHandler?: BrowserRendererFrameHandler
  keyCount: number
  launcher?: BrowserLauncher
   launchOptions?: Record<string, unknown>
  liveHardwareMode?: boolean
  preset?: RenderPreset
}

export interface BrowserRendererFrame {
  buffers: Map<number, Buffer>
  reason: "steady-state" | "update"
  version: number
}

export type BrowserRendererFrameHandler = (frame: BrowserRendererFrame) => Promise<void> | void

export interface BrowserRenderer {
  captureKeyBuffers: () => Promise<Map<number, Buffer>>
  close: () => Promise<void>
  keyCount: number
  setFrameHandler: (handler?: BrowserRendererFrameHandler) => void
  start: () => Promise<void>
  updateDeck: (html: string) => Promise<void>
}

export const MIN_MEDIA_SAMPLE_INTERVAL_MS = 250
export const MAX_MEDIA_SAMPLE_INTERVAL_MS = 2000
export const LIVE_HARDWARE_CAPTURE_INTERVAL_MS = 250
const CAPTURE_HTML_FILE_NAME = "deck.html"

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

export function getVirtualDeckDevices(): VirtualDeckDevice[] {
  return [
    { keyCount: 1, label: "Stream Deck Pedal" },
    { keyCount: 2, label: "Stream Deck Neo (2-key preview)" },
    { keyCount: 3, label: "Stream Deck Mini (row preview)" },
    { keyCount: 6, label: "Stream Deck Mini" },
    { keyCount: 8, label: "Stream Deck +" },
    { keyCount: 15, label: "Stream Deck MK.2" },
    { keyCount: 32, label: "Stream Deck XL" },
  ]
}

function getDeckPixelSize(layout: BrowserRendererLayout, preset: RenderPreset): { height: number; width: number } {
  return {
    height: layout.rows * preset.keyHeight,
    width: layout.columns * preset.keyWidth,
  }
}

async function cropDeckCaptureToKeyBuffers(
  capture: Buffer,
  layout: BrowserRendererLayout,
  preset: RenderPreset,
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
  const matches = [...html.matchAll(/data-sireno-media-sample-interval-ms="(\d+)"/g)]
  if (matches.length === 0) {
    return undefined
  }

  return matches.reduce<number | undefined>((lowestIntervalMs, match) => {
    const parsedIntervalMs = Number.parseInt(match[1] ?? "", 10)
    if (Number.isNaN(parsedIntervalMs)) {
      return lowestIntervalMs
    }

    const boundedIntervalMs = Math.min(
      MAX_MEDIA_SAMPLE_INTERVAL_MS,
      Math.max(MIN_MEDIA_SAMPLE_INTERVAL_MS, parsedIntervalMs),
    )

    if (lowestIntervalMs === undefined || boundedIntervalMs < lowestIntervalMs) {
      return boundedIntervalMs
    }

    return lowestIntervalMs
  }, undefined)
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function createCaptureDocument(): Promise<{ directoryPath: string; filePath: string }> {
  const directoryPath = await mkdtemp(join(tmpdir(), "sireno-browser-renderer-"))
  return {
    directoryPath,
    filePath: join(directoryPath, CAPTURE_HTML_FILE_NAME),
  }
}

export function createBrowserRenderer(options: BrowserRendererOptions): BrowserRenderer {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const viewport = getDeckPixelSize(layout, preset)
  const launchOptions = options.launchOptions ?? { headless: true }
  const liveHardwareMode = options.liveHardwareMode ?? false

  let browser: BrowserLike | null = null
  let context: BrowserContextLike | null = null
  let page: BrowserPageLike | null = null
  let captureDocument: { directoryPath: string; filePath: string } | null = null
  let closed = false
  let frameHandler = options.frameHandler
  let latestHtml = ""
  let latestMediaSampleIntervalMs: number | undefined
  let latestVersion = 0
  let renderedVersion = 0
  let lastCapturedBuffers = new Map<number, Buffer>()
  let lastCaptureAt = 0
  let captureLoopPromise: Promise<void> | null = null
  let wakeCaptureLoop: (() => void) | null = null
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
    captureDocument = await createCaptureDocument()

    return page
  }

  async function renderPageHtml(activePage: BrowserPageLike, html: string, version: number): Promise<void> {
    if (!activePage.goto || !captureDocument) {
      await activePage.setContent(html)
      return
    }

    await writeFile(captureDocument.filePath, html, "utf8")
    await activePage.goto(`${pathToFileURL(captureDocument.filePath).href}?v=${version}`, { waitUntil: "load" })
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

  function notifyCaptureLoop(): void {
    wakeCaptureLoop?.()
  }

  async function waitForNextCaptureWindow(ms: number): Promise<void> {
    if (ms <= 0) {
      return
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (wakeCaptureLoop === wake) {
          wakeCaptureLoop = null
        }
        resolve()
      }, ms)

      const wake = () => {
        clearTimeout(timeout)
        if (wakeCaptureLoop === wake) {
          wakeCaptureLoop = null
        }
        resolve()
      }

      wakeCaptureLoop = wake
    })
  }

  async function runCaptureLoop(): Promise<void> {
    try {
      while (!closed) {
        const hasPendingUpdate = renderedVersion < latestVersion
        const shouldSteadyStateCapture = liveHardwareMode && renderedVersion > 0 && renderedVersion === latestVersion

        if (!hasPendingUpdate && !shouldSteadyStateCapture) {
          break
        }

        if (shouldSteadyStateCapture) {
          const waitMs = Math.max(0, lastCaptureAt + LIVE_HARDWARE_CAPTURE_INTERVAL_MS - Date.now())
          await waitForNextCaptureWindow(waitMs)

          if (closed) {
            break
          }

          if (renderedVersion < latestVersion) {
            continue
          }
        }

        const requestedVersion = latestVersion
        const requestedHtml = latestHtml
        const requestedSampleIntervalMs = latestMediaSampleIntervalMs
        const captureReason = renderedVersion < requestedVersion ? "update" : "steady-state"

        if (
          captureReason === "update" &&
          renderedVersion > 0 &&
          requestedSampleIntervalMs !== undefined
        ) {
          const waitMs = Math.max(0, lastCaptureAt + requestedSampleIntervalMs - Date.now())
          await waitForNextCaptureWindow(waitMs)

          if (closed) {
            break
          }

          if (requestedVersion !== latestVersion) {
            continue
          }
        }

        const activePage = await ensurePage()
        if (captureReason === "update") {
          await renderPageHtml(activePage, requestedHtml, requestedVersion)
        }
        const capture = await activePage.screenshot({ fullPage: true })

        if (requestedVersion !== latestVersion) {
          continue
        }

        lastCapturedBuffers = await cropDeckCaptureToKeyBuffers(capture, layout, preset)
        lastCaptureAt = Date.now()
        renderedVersion = Math.max(renderedVersion, requestedVersion)

        await frameHandler?.({
          buffers: lastCapturedBuffers,
          reason: captureReason,
          version: requestedVersion,
        })

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
    keyCount: options.keyCount,
    setFrameHandler(handler) {
      frameHandler = handler
      if (frameHandler && liveHardwareMode && latestVersion > 0) {
        void ensureCaptureLoop().catch(() => {})
      }
    },
    async start() {
      await ensurePage()
    },
    async updateDeck(html) {
      latestHtml = html
      latestMediaSampleIntervalMs = parseMediaSampleIntervalMs(html)
      latestVersion += 1
      notifyCaptureLoop()

      if (liveHardwareMode && frameHandler) {
        void ensureCaptureLoop().catch(() => {})
      }
    },
    async captureKeyBuffers() {
      if (latestVersion === 0 || renderedVersion >= latestVersion) {
        return lastCapturedBuffers
      }

      const requestedVersion = latestVersion
      return new Promise<Map<number, Buffer>>((resolve, reject) => {
        captureWaiters.push({ reject, requestedVersion, resolve })
        void ensureCaptureLoop().catch(() => {})
      })
    },
    async close() {
      closed = true
      notifyCaptureLoop()

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
      if (captureDocument) {
        await rm(captureDocument.directoryPath, { force: true, recursive: true }).catch(() => {})
        captureDocument = null
      }
    },
  }
}
