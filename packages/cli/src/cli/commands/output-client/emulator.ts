import { dirname } from "node:path"
import { homedir } from "node:os"

import type { ButtonActionMessage, WsMessage } from "@/api/protocol-internal"
import { getAllAssets, registerIconForDeck } from "@/core/icon-asset-registry"
import { findConfigPath } from "@/config/discovery"
import {
  resolveIconPath,
  type ResolveIconPathOptions,
} from "@/render/icon-resolver"

import {
  buildDeckConfigMessage,
  killChild,
  resolveEmulatorCwd,
  resolveFrontendCwd,
  spawnEmulatorVite,
  spawnFrontendVite,
  type AddonFrontendRef,
} from "../emulator-mode"

import type { OutputClient, OutputContext, OutputHandle } from "./types"

const DEFAULT_FRONTEND_PORT = 5180
const DEFAULT_EMULATOR_PORT = 52938
const DEFAULT_TIMEOUT_MS = 30_000

const isButtonAction = (m: WsMessage): m is ButtonActionMessage =>
  m.type === "button-action"

export class EmulatorOutputClient implements OutputClient {
  private frontendVite: Awaited<ReturnType<typeof spawnFrontendVite>> | null =
    null
  private emulatorVite: Awaited<ReturnType<typeof spawnEmulatorVite>> | null =
    null

  async start(ctx: OutputContext): Promise<OutputHandle> {
    if (ctx.frontendVite !== undefined) {
      this.frontendVite = {
        process: ctx.frontendVite.process as never,
        url: ctx.frontendVite.url,
      }
    } else {
      this.frontendVite = await spawnFrontendVite({
        port: DEFAULT_FRONTEND_PORT,
        cwd: resolveFrontendCwd(),
        pnpmCommand: "pnpm",
        readyTimeoutMs: DEFAULT_TIMEOUT_MS,
        logger: ctx.logger,
        wsUrl: ctx.bridge.url,
      })
    }

    if (this.frontendVite === null) {
      throw new Error("EmulatorOutputClient: frontend vite not initialized")
    }

    this.emulatorVite = await spawnEmulatorVite({
      port: DEFAULT_EMULATOR_PORT,
      cwd: resolveEmulatorCwd(),
      pnpmCommand: "pnpm",
      readyTimeoutMs: DEFAULT_TIMEOUT_MS,
      logger: ctx.logger,
      wsUrl: ctx.bridge.url,
      frontendUrl: this.frontendVite.url,
    })

    ctx.bridge.onMessage((message) => {
      if (!isButtonAction(message)) return
      ctx.logger.info(
        {
          deckId: message.deckId,
          position: message.position,
          gesture: message.gesture,
        },
        "emulator: button-action received",
      )
      const deck = ctx.decks.find((d) => d.id === message.deckId)
      const button = deck?.buttons.find((b) => {
        const p = Number.parseInt(b.id, 10)
        return Number.isFinite(p) && p === message.position
      })
      if (button === undefined) {
        ctx.logger.warn(
          { deckId: message.deckId, position: message.position },
          "emulator: button-action targets unknown button",
        )
        return
      }
      void ctx.runtime.dispatchGesture(
        `${message.deckId}:${button.id}`,
        message.gesture,
      )
    })

    const mainDeck = ctx.decks.find((d) => d.isMain) ?? ctx.decks[0]
    if (mainDeck !== undefined) {
      const baseDirs: string[] = []
      if (ctx.configPath !== undefined) {
        baseDirs.push(dirname(ctx.configPath))
      } else {
        const discovered = findConfigPath({ homeDir: homedir() })
        if (discovered !== null) baseDirs.push(dirname(discovered))
      }
      const resolverOptions: ResolveIconPathOptions = {
        addonDirs: new Map(
          Array.from(ctx.addonByType.values())
            .filter((ref) => ref.frontendEntry !== null)
            .map(
              (ref) =>
                [ref.name, dirname(ref.frontendEntry as string)] as const,
            ),
        ),
        baseDirs,
      }
      ctx.bridge.onConnection((socket) => {
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
              ctx.addonByType as unknown as Map<string, AddonFrontendRef>,
              resolverOptions,
              { navStackDepth: 1, hasOverlayDeckAvailable: false },
              15,
            ),
          ),
        )
        ctx.logger.info(
          { deckId: mainDeck.id, buttons: mainDeck.buttons.length },
          "emulator: deck-config sent to new client",
        )
      })
    }

    const frontendPid = this.frontendVite.process.pid ?? 0
    const emulatorPid = this.emulatorVite.process.pid ?? 0
    const childPids = [frontendPid, emulatorPid].filter((p) => p > 0)

    const frontendVite = this.frontendVite
    const emulatorVite = this.emulatorVite
    this.frontendVite = null
    this.emulatorVite = null

    return {
      frontendUrl: frontendVite.url,
      emulatorUrl: emulatorVite.url,
      wsUrl: ctx.bridge.url,
      childPids,
      async stop(): Promise<void> {
        if (frontendVite !== null) await killChild(frontendVite.process)
        if (emulatorVite !== null) await killChild(emulatorVite.process)
      },
    }
  }
}

void resolveIconPath
