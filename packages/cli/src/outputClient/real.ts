import { dirname } from "node:path"
import { homedir } from "node:os"

import type pino from "pino"

import { findConfigPath } from "@/config/discovery"
import { createGestureDetector } from "@/core/gesture-state"
import { getAllAssets, registerIconForDeck } from "@/core/icon-asset-registry"
import type { DeviceDescriptor } from "@/device/registry"
import {
  connectStreamDeck,
  type StreamDeckDevice,
} from "@/device/stream-deck"
import type { ResolveIconPathOptions } from "@/render/icon-resolver"
import { BrowserRenderer } from "@/render/browser-renderer"
import {
  NoStreamDeckFoundError,
  selectDevice,
} from "@/system/device-selection"
import { saveDeviceConfig } from "@/util/device-config"

import {
  buildDeckConfigMessage,
  resolveFrontendCwd,
  spawnFrontendVite,
  type AddonFrontendRef,
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

    const mainDeck = opts.decks.find((d) => d.isMain) ?? opts.decks[0]
    const resolverOptions = buildResolverOptions(opts.addonByType, opts.configPath)

    if (mainDeck !== undefined) {
      opts.bridge.onConnection((socket) => {
        registerIconForDeck(mainDeck.buttons, resolverOptions)
        const assets = getAllAssets()
        if (assets.length > 0) {
          const assetsMsg = {
            type: "assets" as const,
            deckId: mainDeck.id,
            assets: assets.map((a) => ({
              id: a.id,
              filename: a.filename,
              data: a.data,
            })),
          }
          socket.send(JSON.stringify(assetsMsg))
        }
        const msg = buildDeckConfigMessage(
          mainDeck,
          opts.addonByType as unknown as Map<string, AddonFrontendRef>,
          resolverOptions,
          {
            navStackDepth: opts.runtime.navStackDepth(),
            hasOverlayDeckAvailable: false,
          },
          descriptor.keyCount,
          true,
        )
        logger.info(
          {
            deckId: msg.deckId,
            buttonCount: msg.surfaces[msg.deckId]?.buttons.length,
          },
          "real mode: sending deck-config",
        )
        socket.send(JSON.stringify(msg))
      })
    } else {
      logger.warn("real mode: no main deck available to send")
    }

    const keyIndexToButtonId = new Map<number, string>()
    if (mainDeck !== undefined) {
      for (const button of mainDeck.buttons) {
        const index = Number.parseInt(button.id, 10)
        if (Number.isFinite(index)) {
          keyIndexToButtonId.set(index, button.id)
        }
      }
    }
    logger.info(
      { mappedKeys: Array.from(keyIndexToButtonId.entries()) },
      "real mode: keyIndex -> buttonId mapping",
    )

    const gestureDetector = createGestureDetector({
      onGesture: (result) => {
        const buttonId = keyIndexToButtonId.get(result.keyIndex ?? -1)
        if (buttonId === undefined) return
        logger.info(
          { buttonId, gesture: result.kind, keyIndex: result.keyIndex },
          "real mode: gesture detected, dispatching",
        )
        void opts.runtime.dispatchGesture(buttonId, result.kind)
      },
    })

    const gestureUnsubscribe = device.onKeyEvent((event) => {
      logger.info(
        { keyIndex: event.keyIndex, type: event.type },
        "real mode: key event received",
      )
      const buttonId = keyIndexToButtonId.get(event.keyIndex)
      if (buttonId === undefined) {
        logger.warn(
          { keyIndex: event.keyIndex },
          "real mode: keyIndex not mapped to any button",
        )
        return
      }
      gestureDetector.detect({
        type: event.type,
        timestamp: event.timestamp,
        keyIndex: event.keyIndex,
      })
    })

    let frontendUrl = opts.frontendUrl ?? `http://127.0.0.1:${opts.port ?? 5173}`
    let frontendVite: Awaited<ReturnType<typeof spawnFrontendVite>> | undefined
    if (opts.frontendUrl === undefined) {
      frontendVite = await spawnFrontendVite({
        port: opts.port ?? 5173,
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

const buildResolverOptions = (
  addonByType: InitOptions["addonByType"],
  configPath: string | undefined,
): ResolveIconPathOptions => {
  const addonDirs = new Map<string, string>()
  for (const ref of addonByType.values()) {
    if (ref.frontendEntry !== null) {
      addonDirs.set(ref.name, dirname(ref.frontendEntry))
    }
  }
  const baseDirs: string[] = []
  if (configPath !== undefined) {
    baseDirs.push(dirname(configPath))
  } else {
    const discovered = findConfigPath({ homeDir: homedir() })
    if (discovered !== null) {
      baseDirs.push(dirname(discovered))
    }
  }
  return { addonDirs, baseDirs }
}