import { fileURLToPath } from "node:url"

import type pino from "pino"

import { createGestureDetector } from "@/core/gesture-state"
import type { DeviceDescriptor } from "@/device/registry"
import { connectStreamDeck, type StreamDeckDevice } from "@/device/stream-deck"
import { BrowserRenderer } from "@/render/browser-renderer"
import { pushRawImage } from "@/render/push-raw-image"
import { NoStreamDeckFoundError, selectDevice } from "@/system/device-selection"
import { saveDeviceConfig } from "@/util/device-config"

import {
  DEFAULT_FRONTEND_PORT,
  killChild,
  resolveFrontendCwd,
  spawnFrontendVite,
} from "../cli/commands/emulator-mode"
import {
  supervise,
  type SuperviseHandle,
} from "../cli/commands/subprocess-supervisor"

import type { InitOptions, OutputClient, OutputHandle } from "./types"

export interface RealOutputClientOptions {
  readonly xdgConfigHome: string
}

export class RealOutputClient implements OutputClient {
  readonly kind = "real" as const

  private readonly xdgConfigHome: string
  private device: StreamDeckDevice | null = null
  private descriptor: DeviceDescriptor | null = null

  constructor(options: RealOutputClientOptions) {
    this.xdgConfigHome = options.xdgConfigHome
  }

  async validateReady(): Promise<void> {
    const devices = await this.listDevices()
    if (devices.length === 0) {
      throw new Error(
        "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules for vendor 0fd9 may be required — see packages/cli/src/device/linux-udev.ts for the rule file template.",
      )
    }
  }

  async listDevices(): Promise<ReadonlyArray<DeviceDescriptor>> {
    return (await import("@/device/registry")).listDevices()
  }

  async selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor> {
    try {
      const selection = await selectDevice({
        devices,
        ...(savedId !== null
          ? {
              current: {
                serial: savedId,
                model: "",
              },
            }
          : {}),
        logger,
      })
      this.descriptor = selection.descriptor
      return selection.descriptor
    } catch (err) {
      if (err instanceof NoStreamDeckFoundError) {
        throw new Error(
          "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules may be required — see sireno install-udev.",
        )
      }
      throw err
    }
  }

  async storeSelection(descriptor: DeviceDescriptor): Promise<void> {
    saveDeviceConfig({
      xdgConfigHome: this.xdgConfigHome,
      config: {
        serial: descriptor.id,
        model: descriptor.model,
      },
    })
  }

  async init(opts: InitOptions): Promise<OutputHandle> {
    if (this.descriptor === null) {
      throw new Error("RealOutputClient.init: selectDevice() must run first")
    }
    const descriptor = this.descriptor
    const logger = opts.logger

    let device: StreamDeckDevice
    try {
      device = await connectStreamDeck({ serial: descriptor.id })
    } catch {
      throw new Error(
        `Saved device ${descriptor.id} is no longer connected. Re-run with --config to pick another.`,
      )
    }
    this.device = device

    // ponytail: hardware-only splash — push the logo immediately after the
    // device is connected and before Playwright/Vite takes over. pushRawImage
    // swallows errors (non-fatal). Skipped on emulator (no pushRawImage method).
    const splashPath = fileURLToPath(
      new URL("../assets/logoFull.png", import.meta.url),
    )
    try {
      await pushRawImage({
        imagePath: splashPath,
        device,
        logger,
      })
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, splashPath },
        "real: splash push failed (non-fatal)",
      )
    }

    opts.bridge.setDevice(descriptor)

    const unsubscribeBrightness = opts.pubSub.subscribe<{
      deckId: string
      position: number
      durationMs: number
    }>("runtime:buttonError", () => {})
    void unsubscribeBrightness

    const unsubAdjust = opts.pubSub.subscribe<{
      direction: "up" | "down"
      value: number
    }>("methods:adjustBrightness", ({ value }) => {
      if (this.device === null) return
      const current = this.device.brightness
      if (value === current) return
      this.device.setBrightness(value)
      logger.info(
        { from: current, to: value },
        "real mode: hardware brightness adjusted",
      )
      opts.pubSub.publish("sireno:settings:brightness", { value })
    })

    const mainDeck = opts.decks.find((d) => d.isMain) ?? opts.decks[0]

    const gestureDetector = createGestureDetector({
      onGesture: (result) => {
        const keyIndex = result.keyIndex ?? -1
        logger.info(
          { keyIndex, gesture: result.kind },
          "real mode: gesture detected, resolving against active deck",
        )
        const activeDeck = opts.runtime.getActiveDeck()
        const button = activeDeck.buttons.find((b) => {
          if (b.position === keyIndex) return true
          const parsed = Number.parseInt(b.id, 10)
          return Number.isFinite(parsed) && parsed === keyIndex
        })
        if (button === undefined) {
          logger.warn(
            { keyIndex, activeDeckId: activeDeck.id },
            "real mode: keyIndex not mapped to any button on active deck",
          )
          return
        }
        void opts.runtime.dispatchGesture(
          `${activeDeck.id}:${button.id}`,
          result.kind,
        )
      },
    })

    const gestureUnsubscribe = device.onKeyEvent((event) => {
      logger.info(
        { keyIndex: event.keyIndex, type: event.type },
        "real mode: key event received",
      )
      gestureDetector.detect({
        type: event.type,
        timestamp: event.timestamp,
        keyIndex: event.keyIndex,
      })
    })
    void mainDeck

    let frontendUrl =
      opts.frontendUrl ??
      `http://127.0.0.1:${opts.port ?? DEFAULT_FRONTEND_PORT}`
    let shuttingDown = false
    let frontendSupervisor: SuperviseHandle | null = null
    if (opts.frontendUrl === undefined) {
      frontendSupervisor = await supervise({
        label: "frontend vite",
        kill: killChild,
        spawn: async () => {
          const r = await spawnFrontendVite({
            port: opts.port ?? DEFAULT_FRONTEND_PORT,
            cwd: resolveFrontendCwd(),
            pnpmCommand: "pnpm",
            readyTimeoutMs: 30_000,
            wsUrl: `ws://127.0.0.1:${opts.bridge.port}`,
            logger,
            themeDir: opts.themeDir,
            ...(opts.onChildPid !== undefined
              ? { onPid: opts.onChildPid }
              : {}),
          })
          frontendUrl = r.url
          return r.process
        },
        onGiveUp: () => opts.onChildCrash?.(),
        isShuttingDown: () => shuttingDown,
        logger,
      })
    }

    logger.info({ frontendUrl }, "real mode: frontend URL")

    const renderer = new BrowserRenderer({
      frontendUrl: `${frontendUrl}${frontendUrl.includes("?") ? "&" : "?"}compact=1`,
      device,
      logger,
      ...(opts.intervalMs !== undefined ? { intervalMs: opts.intervalMs } : {}),
      pubSub: opts.pubSub,
    })
    await renderer.start()

    const frontendVitePid = frontendSupervisor?.process.pid ?? 0
    const childPids = frontendVitePid > 0 ? [frontendVitePid] : []

    const buildBlackBuffer = (): Buffer => {
      const keyCount = device.getKeyCount()
      const stride = 3 * 8
      const total = keyCount * stride * 8
      return Buffer.alloc(total)
    }

    return {
      descriptor,
      frontendUrl,
      wsUrl: opts.bridge.url,
      childPids,
      async pushBlackFrame(): Promise<void> {
        try {
          const buf = buildBlackBuffer()
          for (let i = 0; i < device.getKeyCount(); i++) {
            await device.fillKeyBuffer(i, buf.subarray(0, 3 * 8 * 8))
          }
          logger.info("real: pushed black frame")
        } catch (err) {
          logger.warn(
            { err: (err as Error).message },
            "real: pushBlackFrame failed (non-fatal)",
          )
        }
      },
      async pushRawImage(filePath: string): Promise<void> {
        try {
          await pushRawImage({
            imagePath: filePath,
            device,
            logger,
          })
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, filePath },
            "real: pushRawImage failed (non-fatal)",
          )
        }
      },
      async stop(): Promise<void> {
        gestureUnsubscribe()
        try {
          await renderer.stop()
        } finally {
          try {
            await device.close()
          } catch {
            void 0
          }
        }
        if (frontendSupervisor !== null) {
          shuttingDown = true
          // supervisor.stop() SIGTERMs the live child (respawn-aware) and
          // falls back to SIGKILL. The previous killChild(handle.process)
          // captured the initial child and leaked the respawned vite.
          await frontendSupervisor.stop()
        }
      },
    }
  }
}
