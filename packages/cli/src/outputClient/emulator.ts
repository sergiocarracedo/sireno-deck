import { execFile } from "node:child_process"
import { platform } from "node:os"

import type pino from "pino"

import type {
  ButtonActionMessage,
  SetDeviceMessage,
  WsMessage,
} from "@/api/protocol-internal"
import { resolveKeyCount } from "@/device/models"
import type { DeviceDescriptor } from "@/device/registry"
import { writeRuntimeState, type RuntimeState } from "@/util/daemon"

import {
  DEFAULT_EMULATOR_PORT,
  DEFAULT_FRONTEND_PORT,
  killChild,
  resolveEmulatorCwd,
  resolveFrontendCwd,
  spawnEmulatorVite,
  spawnFrontendVite,
} from "../cli/commands/emulator-mode"
import {
  DEFAULT_VITE_RETRY_SCHEDULE_MS,
  supervise,
  type SuperviseHandle,
} from "../cli/commands/subprocess-supervisor"

import type { InitOptions, OutputClient, OutputHandle } from "./types"

const DEFAULT_TIMEOUT_MS = 30_000

const VIRTUAL_MODELS = ["mk2", "mini", "xl"] as const

const isButtonAction = (m: WsMessage): m is ButtonActionMessage =>
  m.type === "button-action"

const isSetDevice = (m: WsMessage): m is SetDeviceMessage =>
  m.type === "set-device"

const openBrowser = (
  url: string,
  logger: pino.Logger,
  noOpen = false,
): void => {
  if (noOpen) {
    logger.debug("browser auto-open disabled")
    return
  }
  const os = platform()
  const cmd = os === "win32" ? "cmd" : os === "darwin" ? "open" : "xdg-open"
  const args = os === "win32" ? ["/c", "start", "", url] : [url]
  execFile(cmd, args, (err) => {
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
    const logger = opts.logger.child({ component: "emulator" })
    let shuttingDown = false

    const remote = opts.remote === true
    const host: "127.0.0.1" | "0.0.0.0" = remote ? "0.0.0.0" : "127.0.0.1"
    const token = process.env["SIRENO_TOKEN"] ?? ""
    const requireToken = remote ? token : undefined

    // ponytail: supervise each vite child independently — frontend crash
    // respawns only the frontend, emulator crash respawns only the emulator.
    // Both share the same `onChildCrash` so the pipeline exits cleanly when
    // either exhausts its retry budget. The supervisor spawn closure captures
    // the resolved URL into a hoisted `frontendUrl`/`emulatorUrl` so callers
    // see it after the initial await; subsequent respawns bind the same port
    // so the URL stays accurate.
    let frontendUrl = ""
    let emulatorUrl = ""

    const frontendSupervisor: SuperviseHandle | null =
      opts.frontendUrl !== undefined
        ? (() => {
            frontendUrl = opts.frontendUrl
            return null
          })()
        : await supervise({
            label: "frontend vite",
            kill: killChild,
            delayScheduleMs: DEFAULT_VITE_RETRY_SCHEDULE_MS,
            spawn: async () => {
              const r = await spawnFrontendVite({
                port: DEFAULT_FRONTEND_PORT,
                cwd: resolveFrontendCwd(),
                pnpmCommand: "pnpm",
                readyTimeoutMs: DEFAULT_TIMEOUT_MS,
                logger,
                wsUrl: opts.bridge.url,
                host,
                ...(requireToken !== undefined ? { requireToken } : {}),
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

    const emulatorSupervisor = await supervise({
      label: "emulator vite",
      kill: killChild,
      delayScheduleMs: DEFAULT_VITE_RETRY_SCHEDULE_MS,
      spawn: async () => {
        const r = await spawnEmulatorVite({
          port: DEFAULT_EMULATOR_PORT,
          cwd: resolveEmulatorCwd(),
          pnpmCommand: "pnpm",
          readyTimeoutMs: DEFAULT_TIMEOUT_MS,
          logger,
          wsUrl: opts.bridge.url,
          host,
          frontendUrl:
            opts.frontendUrl ?? `http://127.0.0.1:${DEFAULT_FRONTEND_PORT}`,
          ...(requireToken !== undefined ? { requireToken } : {}),
          ...(opts.onChildPid !== undefined ? { onPid: opts.onChildPid } : {}),
        })
        emulatorUrl = r.url
        return r.process
      },
      onGiveUp: () => opts.onChildCrash?.(),
      isShuttingDown: () => shuttingDown,
      logger,
    })

    opts.bridge.setDevice(descriptor)

    opts.bridge.onMessage((message) => {
      if (isSetDevice(message)) {
        if (
          !VIRTUAL_MODELS.includes(
            message.deviceId as (typeof VIRTUAL_MODELS)[number],
          )
        ) {
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
        // carries the correct layout. The rebuild path runs
        // positionButtons(runtimeDeck.config, keyCount) on every deck so
        // positions always come from the original config snapshot, never
        // from prior in-memory state.
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
      logger.debug(
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
      logger.debug(
        {
          activeDeckId: activeDeck.id,
          position: message.position,
          gesture: message.gesture,
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

    const frontendPid = frontendSupervisor?.process.pid ?? 0
    const emulatorPid = emulatorSupervisor.process.pid ?? 0
    const childPids = [frontendPid, emulatorPid].filter((p) => p > 0)

    logger.info(
      {
        emulatorUrl,
        frontendUrl,
        wsUrl: opts.bridge.url,
      },
      "emulator mode ready",
    )
    if (remote) {
      process.stdout.write(`\n  Emulator:  ${emulatorUrl}\n\n`)
      const lanHost = opts.lanHost ?? "127.0.0.1"
      const state: RuntimeState = {
        emulatorUrl,
        wsUrl: opts.bridge.url,
        frontendUrl,
        token,
        lanHost,
        addresses: opts.lanAddresses ?? [],
        emulatorMode: true,
        remote: true,
        startedAt: Date.now(),
        theme: opts.theme.name,
      }
      writeRuntimeState(state)
    } else {
      process.stdout.write(
        `\n  Emulator:  ${emulatorUrl}\n  Frontend:  ${frontendUrl}\n\n`,
      )
      openBrowser(emulatorUrl, logger, opts.noAutoOpen === true)
      const lanHost = opts.lanHost ?? "127.0.0.1"
      const state: RuntimeState = {
        emulatorUrl,
        wsUrl: opts.bridge.url,
        frontendUrl,
        token,
        lanHost,
        addresses: opts.lanAddresses ?? [],
        emulatorMode: true,
        remote: false,
        startedAt: Date.now(),
        theme: opts.theme.name,
      }
      writeRuntimeState(state)
    }

    opts.runtime.setBrightness(opts.runtime.getBrightness())

    return {
      descriptor,
      frontendUrl,
      emulatorUrl,
      wsUrl: opts.bridge.url,
      childPids,
      async stop(): Promise<void> {
        shuttingDown = true
        // The supervisor's stop() now SIGTERMs the current mutable child and
        // falls back to SIGKILL after a grace period. After a respawn the
        // live vite is the one killed — the previous stale-.process bug
        // leaked the respawned child and bound the port.
        await Promise.allSettled([
          emulatorSupervisor.stop(),
          frontendSupervisor?.stop() ?? Promise.resolve(),
        ])
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
