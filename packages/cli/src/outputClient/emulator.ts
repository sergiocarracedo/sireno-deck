import { exec } from "node:child_process"
import { platform } from "node:os"

import type pino from "pino"

import type { ButtonActionMessage, WsMessage } from "@/api/protocol-internal"
import { resolveKeyCount } from "@/device/models"
import type { DeviceDescriptor } from "@/device/registry"
import { computeSystemButtonForSlotN1 } from "@/deck/system-back-injection"

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

const VIRTUAL_MODELS = ["mk2", "xl"] as const

const isButtonAction = (m: WsMessage): m is ButtonActionMessage =>
  m.type === "button-action"

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
      if (button === undefined) {
        // No user-defined button at this position — could be an injected
        // system button (n-1 slot) that lives in the broadcast but not the
        // runtime deck; dispatch the corresponding runtime action directly.
        const navState = {
          navStackDepth: opts.runtime.navStackDepth(),
          hasOverlayDeckAvailable: opts.runtime.hasOverlayDeckAvailable(),
        }
        const n1Position = descriptor.keyCount - 1
        if (message.position === n1Position) {
          const sysType = computeSystemButtonForSlotN1(activeDeck, navState)
          if (sysType === "core:back") {
            logger.info(
              { activeDeckId: activeDeck.id, position: message.position },
              "emulator: dispatching runtime.goBack() for injected back button",
            )
            opts.runtime.goBack()
            return
          }
        }
        logger.warn(
          { activeDeckId: activeDeck.id, position: message.position },
          "emulator: button-action targets unknown button",
        )
        return
      }
      if (button.type === "core:back") {
        logger.info(
          { activeDeckId: activeDeck.id, position: message.position },
          "emulator: dispatching runtime.goBack() for core:back button",
        )
        opts.runtime.goBack()
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
