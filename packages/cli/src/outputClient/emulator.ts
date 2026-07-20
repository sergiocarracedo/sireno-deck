import { exec } from "node:child_process"
import { platform } from "node:os"

import type pino from "pino"

import type { ButtonActionMessage, SetDeviceMessage, WsMessage } from "@/api/protocol-internal"
import { resolveKeyCount } from "@/device/models"
import type { DeviceDescriptor } from "@/device/registry"

import {
  DEFAULT_EMULATOR_PORT,
  DEFAULT_FRONTEND_PORT,
  killChild,
  resolveEmulatorCwd,
  resolveFrontendCwd,
  spawnEmulatorVite,
  spawnFrontendVite,
} from "../cli/commands/emulator-mode"

import type { InitOptions, OutputClient, OutputHandle } from "./types"

const DEFAULT_TIMEOUT_MS = 30_000

const VIRTUAL_MODELS = ["mk2", "mini", "xl"] as const

const isButtonAction = (m: WsMessage): m is ButtonActionMessage =>
  m.type === "button-action"

const isSetDevice = (m: WsMessage): m is SetDeviceMessage =>
  m.type === "set-device"

const openBrowser = (url: string, logger: pino.Logger): void => {
  const os = platform()
  const cmd = os === "win32" ? "cmd" : os === "darwin" ? "open" : "xdg-open"
  const args = os === "win32" ? ["/c", "start", "", url] : [url]
  exec(cmd, args, (err) => {
    if (err !== null) {
      logger.debug(
        { err: err.message },
        "browser auto-open unavailable, open the URL manually",
      )
    }
  })
}

export class EmulatorOutputClient implements OutputClient {
  readonly kind = "emulator" as const

  private descriptor: DeviceDescriptor | null = null

  async validateReady(): Promise<void> {
    void this.kind
  }

  async listDevices(): Promise<ReadonlyArray<DeviceDescriptor>> {
    return VIRTUAL_MODELS.map((model) => buildVirtualDescriptor(model))
  }

  async selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor> {
    void logger
    const match =
      savedId !== null ? devices.find((d) => d.id === savedId) : undefined
    if (match !== undefined) {
      this.descriptor = match
      return match
    }
    const fallback = devices.find((d) => d.model === "mk2") ?? devices[0]
    if (fallback === undefined) {
      throw new Error("EmulatorOutputClient: no virtual devices available")
    }
    this.descriptor = fallback
    return fallback
  }

  async storeSelection(_descriptor: DeviceDescriptor): Promise<void> {
    void _descriptor
  }

  async init(opts: InitOptions): Promise<OutputHandle> {
    if (this.descriptor === null) {
      throw new Error(
        "EmulatorOutputClient.init: selectDevice() must run first",
      )
    }
    const descriptor = this.descriptor
    const logger = opts.logger

    const frontendVite =
      opts.frontendUrl !== undefined
        ? {
            process: {
              kill: (sig: string): void => {
                void sig
              },
            } as { pid?: number; kill(signal: string): void },
            url: opts.frontendUrl,
          }
        : await spawnFrontendVite({
            port: DEFAULT_FRONTEND_PORT,
            cwd: resolveFrontendCwd(),
            pnpmCommand: "pnpm",
            readyTimeoutMs: DEFAULT_TIMEOUT_MS,
            logger,
            wsUrl: opts.bridge.url,
          })

    const emulatorVite = await spawnEmulatorVite({
      port: DEFAULT_EMULATOR_PORT,
      cwd: resolveEmulatorCwd(),
      pnpmCommand: "pnpm",
      readyTimeoutMs: DEFAULT_TIMEOUT_MS,
      logger,
      wsUrl: opts.bridge.url,
      frontendUrl: frontendVite.url,
    })

    opts.bridge.setDevice(descriptor)

    opts.bridge.onMessage((message) => {
      if (isSetDevice(message)) {
        if (!VIRTUAL_MODELS.includes(message.deviceId as (typeof VIRTUAL_MODELS)[number])) {
          logger.warn(
            { deviceId: message.deviceId },
            "emulator: ignoring unsupported virtual device",
          )
          return
        }
        const descriptor = buildVirtualDescriptor(message.deviceId)
        this.descriptor = descriptor
        opts.bridge.setDevice(descriptor)
        // The runtime was built once at startup with the original device's
        // keyCount, so system-button injection + pagination baked in the
        // wrong n-1 / n-2 positions. Rebuild with the new keyCount and
        // swap the runtime's deck set so the next deck-config broadcast
        // carries the correct layout.
        if (opts.rebuildDecksForKeyCount !== undefined) {
          const rebuilt = opts.rebuildDecksForKeyCount(descriptor.keyCount)
          opts.runtime.setDecks(rebuilt)
        }
        logger.info(
          { deviceId: message.deviceId },
          "emulator: virtual device changed",
        )
        return
      }
      if (!isButtonAction(message)) return
      logger.info(
        {
          deckId: message.deckId,
          position: message.position,
          gesture: message.gesture,
        },
        "emulator: button-action received",
      )
      // The runtime is the authority on the active deck. The client sends
      // message.deckId for routing on the frontend (so React knows which
      // cell fired), but the emulator backend uses runtime.getActiveDeck()
      // to resolve the actual deck — this avoids relying on the client's
      // sometimes-stale local view of the active deck.
      const activeDeck = opts.runtime.getActiveDeck()
      const button = activeDeck.buttons.find((b) => {
        if (b.position === message.position) return true
        const parsed = Number.parseInt(b.id, 10)
        return Number.isFinite(parsed) && parsed === message.position
      })
      logger.info(
        {
          activeDeckId: activeDeck.id,
          position: message.position,
          buttonFound: button !== undefined,
          buttonType: button?.type,
          buttonActions: button?.actions,
          buttonsInDeck: activeDeck.buttons.map((b) => ({
            id: b.id,
            position: b.position,
            type: b.type,
          })),
        },
        "[emulator] button lookup",
      )
      if (button === undefined) {
        logger.warn(
          { activeDeckId: activeDeck.id, position: message.position },
          "emulator: button-action targets unknown button",
        )
        return
      }
      void opts.runtime.dispatchGesture(
        `${activeDeck.id}:${button.id}`,
        message.gesture,
      )
    })

    const frontendPid = frontendVite.process.pid ?? 0
    const emulatorPid = emulatorVite.process.pid ?? 0
    const childPids = [frontendPid, emulatorPid].filter((p) => p > 0)

    logger.info(
      {
        emulatorUrl: emulatorVite.url,
        frontendUrl: frontendVite.url,
        wsUrl: opts.bridge.url,
      },
      "emulator mode ready",
    )
    process.stdout.write(
      `\n  Emulator:  ${emulatorVite.url}\n  Frontend:  ${frontendVite.url}\n\n`,
    )
    openBrowser(emulatorVite.url, logger)

    opts.runtime.setBrightness(opts.runtime.getBrightness())

    return {
      descriptor,
      frontendUrl: frontendVite.url,
      emulatorUrl: emulatorVite.url,
      wsUrl: opts.bridge.url,
      childPids,
      async stop(): Promise<void> {
        await killChild(emulatorVite.process)
        if (opts.frontendUrl === undefined) {
          await killChild(frontendVite.process)
        }
      },
    }
  }
}

const buildVirtualDescriptor = (model: string): DeviceDescriptor => ({
  id: `emulator:${model}`,
  model,
  keyCount: resolveKeyCount(model),
  label: `Emulator ${model.toUpperCase()}`,
  transport: "emulated",
})
