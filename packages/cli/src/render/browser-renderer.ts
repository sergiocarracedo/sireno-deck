import sharp from "sharp"

import { BUTTON_SIZE_PX, gridForKeyCount } from "@/device/models"
import type { PubSub } from "@/core/pub-sub"
import { createPubSub } from "@/core/pub-sub"
import type pino from "pino"

import { BufferChangeTracker } from "./buffer-hash"
import { CadenceTimer, EventDebouncer } from "./screenshot-cadence"

export interface PlaywrightLike {
  chromium: {
    launch(opts?: { headless?: boolean; args?: string[] }): Promise<BrowserLike>
  }
}
export interface BrowserLike {
  newContext(): Promise<ContextLike>
  close(): Promise<void>
}
export interface ContextLike {
  newPage(): Promise<PageLike>
  close(): Promise<void>
}
export interface PageLike {
  goto(url: string, opts?: { waitUntil?: string }): Promise<unknown>
  screenshot(opts: { type: "png" }): Promise<Buffer>
  close(): Promise<void>
}

export interface DeviceSink {
  getKeyCount(): number
  fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void>
}

export interface BrowserRendererOptions {
  readonly frontendUrl: string
  readonly device: DeviceSink
  readonly logger: pino.Logger
  readonly pubSub?: PubSub
  readonly intervalMs?: number
  readonly eventDebounceMs?: number
  readonly playwrightFactory?: () => PlaywrightLike | Promise<PlaywrightLike>
}

const DEFAULT_INTERVAL_MS = 500
const DEFAULT_EVENT_DEBOUNCE_MS = 50

interface Subscription {
  unsubscribe: () => void
}

export class BrowserRenderer {
  private readonly intervalMs: number
  private readonly eventDebounceMs: number
  private readonly pubSub: PubSub | undefined
  private readonly cadence: CadenceTimer
  private readonly debouncer: EventDebouncer
  private readonly tracker = new BufferChangeTracker()
  private readonly subscriptions: Subscription[] = []
  /**
   * Number of consecutive ticks where every key buffer was unchanged.
   * Once it crosses `BLANK_THRESHOLD`, we suspect the React tree has been
   * unmounted (typically by an HMR error that escaped the ErrorBoundary)
   * and warn the user via the logger. The renderer does not abort —
   * screenshots still flow — but the operator gets a visible signal.
   */
  private staticBlankTickCount = 0
  private browser: BrowserLike | null = null
  private context: ContextLike | null = null
  private page: PageLike | null = null
  private running = false

  constructor(private readonly options: BrowserRendererOptions) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
    this.eventDebounceMs = options.eventDebounceMs ?? DEFAULT_EVENT_DEBOUNCE_MS
    this.pubSub = options.pubSub
    this.cadence = new CadenceTimer({
      intervalMs: this.intervalMs,
      onTick: () => this.tick("timer"),
      logger: options.logger,
    })
    this.debouncer = new EventDebouncer({
      delayMs: this.eventDebounceMs,
      onFlush: () => this.tick("event"),
      logger: options.logger,
    })
  }

  async start(): Promise<void> {
    if (this.running) return
    const factory =
      this.options.playwrightFactory ??
      (async (): Promise<PlaywrightLike> =>
        (await import("playwright")) as PlaywrightLike)
    const playwright = await factory()
    this.browser = await playwright.chromium.launch({ headless: true })
    const { columns, rows } = gridForKeyCount(this.options.device.getKeyCount())
    const vpWidth = columns * BUTTON_SIZE_PX
    const vpHeight = rows * BUTTON_SIZE_PX
    this.context = await this.browser.newContext({
      viewport: { width: vpWidth, height: vpHeight },
    })
    this.page = await this.context.newPage()
    await this.page.goto(this.options.frontendUrl, { waitUntil: "networkidle" })
    if (this.pubSub) {
      this.subscriptions.push(
        {
          unsubscribe: this.pubSub.subscribe("runtime:activeDeck", () =>
            this.debouncer.trigger(),
          ),
        },
        {
          unsubscribe: this.pubSub.subscribe("runtime:invalidate", () =>
            this.debouncer.trigger(),
          ),
        },
      )
    }
    this.cadence.start()
    this.running = true
  }

  async stop(): Promise<void> {
    if (!this.running) return
    this.running = false
    this.cadence.stop()
    this.debouncer.dispose()
    for (const sub of this.subscriptions) sub.unsubscribe()
    this.subscriptions.length = 0
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    this.page = null
    this.context = null
    this.browser = null
  }

  private static readonly BLANK_THRESHOLD = 20

  private async tick(source: "timer" | "event"): Promise<void> {
    if (!this.page) return
    try {
      const png = await this.page.screenshot({ type: "png" })
      const { columns, rows } = gridForKeyCount(
        this.options.device.getKeyCount(),
      )
      const meta = await sharp(png).metadata()
      const cellWidth = Math.floor((meta.width ?? 0) / columns)
      const cellHeight = Math.floor((meta.height ?? 0) / rows)
      const writes: Array<Promise<void>> = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const keyIndex = r * columns + c
          const cropped = await sharp(png)
            .extract({
              left: c * cellWidth,
              top: r * cellHeight,
              width: cellWidth,
              height: cellHeight,
            })
            .resize(72, 72, { fit: "fill" })
            .removeAlpha()
            .raw()
            .toBuffer()
          if (!this.tracker.update(keyIndex, cropped)) continue
          writes.push(this.options.device.fillKeyBuffer(keyIndex, cropped))
        }
      }
      if (writes.length > 0) {
        await Promise.all(writes)
        this.staticBlankTickCount = 0
        this.options.logger.debug(
          { source, writes: writes.length },
          "renderer tick wrote keys",
        )
      } else {
        this.staticBlankTickCount += 1
        this.options.logger.debug({ source }, "renderer tick no changes")
        if (this.staticBlankTickCount === BrowserRenderer.BLANK_THRESHOLD) {
          this.options.logger.warn(
            {
              consecutiveTicks: this.staticBlankTickCount,
              source,
            },
            "frontend appears blank — React tree may have crashed (check the browser console or HMR errors)",
          )
        }
      }
    } catch (err) {
      this.options.logger.warn({ err, source }, "renderer tick failed")
    }
  }
}

export const _testInternals = { createPubSub }
