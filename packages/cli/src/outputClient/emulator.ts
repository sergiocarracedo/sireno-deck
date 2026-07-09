import { exec } from "node:child_process"
import { dirname } from "node:path"
import { homedir, platform } from "node:os"

import type pino from "pino"

import type { ButtonActionMessage, WsMessage } from "@/api/protocol-internal"
import { findConfigPath } from "@/config/discovery"
import { getAllAssets, registerIconForDeck } from "@/core/icon-asset-registry"
import { resolveKeyCount } from "@/device/models"
import type { DeviceDescriptor } from "@/device/registry"
import type { ResolveIconPathOptions } from "@/render/icon-resolver"

import {
  buildDeckConfigMessage,
  DEFAULT_EMULATOR_PORT,
  DEFAULT_FRONTEND_PORT,
  killChild,
  resolveEmulatorCwd,
  resolveFrontendCwd,
  spawnEmulatorVite,
  spawnFrontendVite,
  type AddonFrontendRef,
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
      savedId !== null
        ? devices.find((d) => d.id === savedId)
        : undefined
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
      throw new Error("EmulatorOutputClient.init: selectDevice() must run first")
    }
    const descriptor = this.descriptor
    const logger = opts.logger

    const frontendVite =
      opts.frontendUrl !== undefined
        ? {
            process: { kill: (sig: string): void => {
              void sig
            } } as { pid?: number; kill(signal: string): void },
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
      const deck = opts.decks.find((d) => d.id === message.deckId)
      const button = deck?.buttons.find((b) => {
        const p = Number.parseInt(b.id, 10)
        return Number.isFinite(p) && p === message.position
      })
      if (button === undefined) {
        logger.warn(
          { deckId: message.deckId, position: message.position },
          "emulator: button-action targets unknown button",
        )
        return
      }
      void opts.runtime.dispatchGesture(
        `${message.deckId}:${button.id}`,
        message.gesture,
      )
    })

    const mainDeck = opts.decks.find((d) => d.isMain) ?? opts.decks[0]
    if (mainDeck !== undefined) {
      const baseDirs: string[] = []
      if (opts.configPath !== undefined) {
        baseDirs.push(dirname(opts.configPath))
      } else {
        const discovered = findConfigPath({ homeDir: homedir() })
        if (discovered !== null) baseDirs.push(dirname(discovered))
      }
      const resolverOptions: ResolveIconPathOptions = {
        addonDirs: new Map(
          Array.from(opts.addonByType.values())
            .filter((ref) => ref.frontendEntry !== null)
            .map(
              (ref) =>
                [ref.name, dirname(ref.frontendEntry as string)] as const,
            ),
        ),
        baseDirs,
      }
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
        socket.send(
          JSON.stringify(
            buildDeckConfigMessage(
              mainDeck,
              opts.addonByType as unknown as Map<string, AddonFrontendRef>,
              resolverOptions,
              { navStackDepth: 1, hasOverlayDeckAvailable: false },
              descriptor.keyCount,
              false,
            ),
          ),
        )
        logger.info(
          { deckId: mainDeck.id, buttons: mainDeck.buttons.length },
          "emulator: deck-config sent to new client",
        )
      })
    }

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