import type pino from "pino"

import { createGestureDetector } from "@/core/gesture-state"
import type { DeviceDescriptor } from "@/device/registry"
import { connectStreamDeck, type StreamDeckDevice } from "@/device/stream-deck"
import { BrowserRenderer } from "@/render/browser-renderer"
import { computeSystemButtonForSlotN1 } from "@/deck/system-back-injection"
import { NoStreamDeckFoundError, selectDevice } from "@/system/device-selection"
import { saveDeviceConfig } from "@/util/device-config"

import {
  DEFAULT_FRONTEND_PORT,
  resolveFrontendCwd,
  spawnFrontendVite,
} from "../cli/commands/emulator-mode"

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
      opts.pubSub.publish("sireno:settings:brightness", value)
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
        // System buttons at n-1 always win over a user-defined button there —
        // the deck-config splice hides them visually, so the runtime must too.
        const n1Position = descriptor.keyCount - 1
        if (keyIndex === n1Position) {
          const sysType = computeSystemButtonForSlotN1(activeDeck, {
            navStackDepth: opts.runtime.navStackDepth(),
            hasOverlayDeckAvailable: opts.runtime.hasOverlayDeckAvailable(),
          })
          if (sysType === "core:back") {
            logger.info(
              { keyIndex },
              "real mode: dispatching runtime.goBack() for injected back button",
            )
            opts.runtime.goBack()
            return
          }
          if (sysType === "core:settings-entry") {
            logger.info(
              { keyIndex },
              "real mode: navigating to internal-settings deck",
            )
            opts.runtime.navigateToDeck("internal-settings:settings")
            return
          }
        }
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
    let frontendVite: Awaited<ReturnType<typeof spawnFrontendVite>> | undefined
    if (opts.frontendUrl === undefined) {
      frontendVite = await spawnFrontendVite({
        port: opts.port ?? DEFAULT_FRONTEND_PORT,
        cwd: resolveFrontendCwd(),
        pnpmCommand: "pnpm",
        readyTimeoutMs: 30_000,
        wsUrl: `ws://127.0.0.1:${opts.bridge.port}`,
        logger,
        themeDir: opts.themeDir,
      })
      frontendUrl = frontendVite.url
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

    const frontendVitePid = frontendVite?.process.pid ?? 0
    const childPids = frontendVitePid > 0 ? [frontendVitePid] : []

    return {
      descriptor,
      frontendUrl,
      wsUrl: opts.bridge.url,
      childPids,
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
        if (frontendVite !== undefined) {
          frontendVite.process.kill("SIGTERM")
        }
      },
    }
  }
}
