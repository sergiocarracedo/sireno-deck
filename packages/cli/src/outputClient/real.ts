import { fileURLToPath } from "node:url"

import type pino from "pino"

import { createGestureDetector } from "@/core/gesture-state"
import { pushBlackFrame } from "@/device/black-frame"
import type { DeviceDescriptor } from "@/device/registry"
import { connectStreamDeck, type StreamDeckDevice } from "@/device/stream-deck"
import { BrowserRenderer } from "@/render/browser-renderer"
import { pushRawImage } from "@/render/push-raw-image"
import { NoStreamDeckFoundError, selectDevice } from "@/system/device-selection"
import { saveDeviceConfig } from "@/util/device-config"

import {
  DEFAULT_FRONTEND_PORT,
  killChild,
  resolveConfigUiCwd,
  resolveFrontendCwd,
  spawnConfigUiVite,
  spawnFrontendVite,
} from "../cli/commands/emulator-mode"
import {
  DEFAULT_VITE_RETRY_SCHEDULE_MS,
  supervise,
  type SuperviseHandle,
} from "../cli/commands/subprocess-supervisor"

import type { InitOptions, OutputClient, OutputHandle } from "./types"
import { writeRuntimeState, type RuntimeState } from "@/util/daemon"

export interface RealOutputClientOptions {
  readonly xdgConfigHome: string
}

export class RealOutputClient implements OutputClient {
  readonly kind = "real" as const

  private readonly xdgConfigHome: string
  private device: StreamDeckDevice | null = null
  // ponytail: the Stream Deck SDK exposes setBrightness but no getter, so we
  // track the last value we set to skip redundant hardware writes.
  private deviceBrightness: number | null = null
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
                path: "",
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
        path: descriptor.id,
        model: descriptor.model,
      },
    })
  }

  async init(opts: InitOptions): Promise<OutputHandle> {
    if (this.descriptor === null) {
      throw new Error("RealOutputClient.init: selectDevice() must run first")
    }
    const descriptor = this.descriptor
    const logger = opts.logger.child({ component: "real" })

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
      const current = this.deviceBrightness
      if (value === current) return
      this.deviceBrightness = value
      void this.device.setBrightness(value)
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
        const activeDeck = opts.runtime.getActiveDeck()
        const button = activeDeck.buttons.find((b) => {
          if (b.position === keyIndex) return true
          const parsed = Number.parseInt(b.id, 10)
          return Number.isFinite(parsed) && parsed === keyIndex
        })
        const position = button?.position ?? -1
        logger.debug(
          {
            keyIndex,
            gesture: result.kind,
            position,
            activeDeckId: activeDeck.id,
            buttonId: button?.id ?? null,
          },
          "real mode: gesture detected",
        )
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
      logger.debug(
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
    let configUiSupervisor: SuperviseHandle | null = null
    if (opts.frontendUrl === undefined) {
      frontendSupervisor = await supervise({
        label: "frontend vite",
        kill: killChild,
        delayScheduleMs: DEFAULT_VITE_RETRY_SCHEDULE_MS,
        spawn: async () => {
          const r = await spawnFrontendVite({
            port: opts.port ?? DEFAULT_FRONTEND_PORT,
            cwd: resolveFrontendCwd(),
            pnpmCommand: "pnpm",
            readyTimeoutMs: 30_000,
            wsUrl: `ws://127.0.0.1:${opts.bridge.port}`,
            logger,
            themeDir: opts.themeDir,
            configPath: opts.configPath,
            emulatorMode: false,
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

    let configUiUrl = `http://127.0.0.1:${DEFAULT_FRONTEND_PORT + 1}`
    configUiSupervisor = await supervise({
      label: "config ui vite",
      kill: killChild,
      delayScheduleMs: DEFAULT_VITE_RETRY_SCHEDULE_MS,
      spawn: async () => {
        const r = await spawnConfigUiVite({
          port: DEFAULT_FRONTEND_PORT + 1,
          cwd: resolveConfigUiCwd(),
          pnpmCommand: "pnpm",
          readyTimeoutMs: 30_000,
          logger,
          wsUrl: `ws://127.0.0.1:${opts.bridge.port}`,
          frontendUrl,
          configPath: opts.configPath,
          emulatorMode: false,
          onPid: opts.onChildPid,
        })
        configUiUrl = r.url
        return r.process
      },
      onGiveUp: () => opts.onChildCrash?.(),
      isShuttingDown: () => shuttingDown,
      logger,
    })

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
    const configUiPid = configUiSupervisor.process.pid ?? 0
    const childPids = [frontendVitePid, configUiPid].filter((pid) => pid > 0)

    const state: RuntimeState = {
      configUiUrl,
      wsUrl: opts.bridge.url,
      frontendUrl,
      lanHost: opts.lanHost ?? "127.0.0.1",
      addresses: opts.lanAddresses ?? [],
      emulatorMode: false,
      remote: false,
      startedAt: Date.now(),
      theme: opts.theme.name,
    }
    writeRuntimeState(state)
    logger.info({ frontendUrl }, "real mode: runtime state written")

    return {
      descriptor,
      frontendUrl,
      configUiUrl,
      wsUrl: opts.bridge.url,
      childPids,
      async pushBlackFrame(): Promise<void> {
        await pushBlackFrame(device, logger)
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
        await configUiSupervisor.stop()
      },
    }
  }
}
