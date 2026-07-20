import type pino from "pino"

import type { PubSub } from "@/core/pub-sub"
import type { Store } from "@/core/store"
import type { KeyMacroProvider } from "@/system/providers/key-macro"
import {
  type RequirementsCheckResult,
  type SystemCapability,
} from "@/system/requirements"
import {
  isValidKey,
  knownKeys,
  parseCombo,
  type ParsedCombo,
} from "@/system/providers/key-macro/parser"
import { NotImplementedError } from "@/util/errors"

import type { ActionExecutor, ActionExecutorOptions } from "@/action/executor"
import type { Runtime, RuntimeDeck } from "./runtime"
import { dispatchMacro } from "./macro-parse"

const DEFAULT_BUTTON_ERROR_DURATION_MS = 5000

export interface KeyMacroAction {
  kind: "key" | "combo" | "text"
  value: string
  modifiers?: ReadonlyArray<"shift" | "ctrl" | "alt" | "meta" | "cmd">
}

export interface MethodsContext {
  runtime: Runtime
  pubSub: PubSub
  store: Store
  executor: ActionExecutor
  logger: pino.Logger
  keyMacroProvider?: KeyMacroProvider
}

export interface Methods {
  runCommand(
    command: string,
    options?: ActionExecutorOptions,
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number
    durationMs: number
  }>
  /**
   * Send a key or combo via the key-macro provider. Equivalent to the OS-level
   * keystroke — Linux uses `wtype`, macOS uses `osascript keystroke`, Windows
   * uses Win32 `SendInput`. Accepts both combos (`ctrl+shift+t`) and plain
   * UTF-8 text (including emoji).
   */
  keyMacro(action: KeyMacroAction): Promise<void>
  /**
   * Convenience wrapper for addons that want to type literal text without
   * constructing a `KeyMacroAction`. Passes straight through to the
   * key-macro provider; the provider is responsible for the actual keystroke
   * injection, so UTF-8 / emoji work everywhere a key-macro tool is
   * available.
   */
  typeText(text: string): Promise<void>
  navigateToDeck(args: { id: string; addToHistory?: boolean }): void
  goBack(): void
  getActiveDeckId(): string
  invalidate(): void
  publish<T>(channel: string, payload: T): void
  subscribe<T>(channel: string, cb: (payload: T) => void): () => void
  setKeyMacroProvider(provider: KeyMacroProvider): void
  setRequirements(requirements: RequirementsCheckResult): void
  checkRequirement(capability: SystemCapability): boolean
  showTemporaryError(
    deckId: string,
    position: number,
    durationMs?: number,
    buttonId?: string,
  ): void
  adjustBrightness(args: { direction: "up" | "down" }): void
  dispatch(value: string): Promise<void>
}

export const createMethods = (ctx: MethodsContext): Methods => {
  let keyMacroProvider: KeyMacroProvider | undefined = ctx.keyMacroProvider
  const logger = ctx.logger
  const setKeyMacroProvider: Methods["setKeyMacroProvider"] = (provider) => {
    keyMacroProvider = provider
  }

  let requirements: RequirementsCheckResult | undefined = undefined
  const setRequirements: Methods["setRequirements"] = (value) => {
    requirements = value
  }
  const checkRequirement: Methods["checkRequirement"] = (capability) => {
    if (requirements === undefined) return true
    return requirements[capability]?.available ?? true
  }
  const showTemporaryError: Methods["showTemporaryError"] = (
    deckId,
    position,
    durationMs = DEFAULT_BUTTON_ERROR_DURATION_MS,
    buttonId,
  ) => {
    ctx.pubSub.publish("runtime:buttonError", {
      deckId,
      position,
      durationMs,
      ...(buttonId !== undefined ? { buttonId } : {}),
    })
  }

  const adjustBrightness: Methods["adjustBrightness"] = ({ direction }) => {
    const step = 10
    const current = ctx.runtime.getBrightness()
    const raw = direction === "up" ? current + step : current - step
    const next = Math.max(10, Math.min(100, Math.round(raw)))
    if (next === current) return
    ctx.runtime.setBrightness(next)
    ctx.pubSub.publish("methods:adjustBrightness", { direction, value: next })
  }

  const navigateToDeck: Methods["navigateToDeck"] = (args) => {
    ctx.runtime.navigateToDeck(args.id, { addToHistory: args.addToHistory })
  }

  const goBack: Methods["goBack"] = () => {
    ctx.runtime.goBack()
  }

  const getActiveDeckId: Methods["getActiveDeckId"] = () => {
    return ctx.runtime.getActiveDeckId()
  }

  const invalidate: Methods["invalidate"] = () => {
    ctx.runtime.invalidate()
  }

  const publish: Methods["publish"] = <T>(channel: string, payload: T) => {
    ctx.pubSub.publish<T>(channel, payload)
  }

  const subscribe: Methods["subscribe"] = <T>(
    channel: string,
    cb: (payload: T) => void,
  ) => {
    return ctx.pubSub.subscribe<T>(channel, cb)
  }

  const runCommand: Methods["runCommand"] = async (command, options) => {
    return await ctx.executor.run(command, options)
  }

  const keyMacro: Methods["keyMacro"] = async (action) => {
    if (keyMacroProvider === undefined) {
      throw new NotImplementedError(
        "methods.keyMacro requires a keyMacroProvider (set via methods.setKeyMacroProvider)",
      )
    }
    if (action.kind === "text") {
      await keyMacroProvider.sendKey(action.value)
      return
    }
    if (action.kind === "key") {
      if (!isValidKey(action.value)) {
        throw new NotImplementedError(
          `methods.keyMacro: unknown key '${action.value}'. Valid keys: ${knownKeys.join(", ")}`,
        )
      }
      await keyMacroProvider.sendKey(action.value)
      return
    }
    const parsed: ParsedCombo | null = parseCombo(action.value)
    if (parsed === null) {
      throw new NotImplementedError(
        `methods.keyMacro: invalid combo '${action.value}'`,
      )
    }
    const combo =
      parsed.mods.length > 0
        ? `${parsed.mods.join("+")}+${parsed.key}`
        : parsed.key
    await keyMacroProvider.sendKey(combo)
  }

  const typeText: Methods["typeText"] = async (text) => {
    if (keyMacroProvider === undefined) {
      throw new NotImplementedError(
        "methods.typeText requires a keyMacroProvider (set via methods.setKeyMacroProvider)",
      )
    }
    await keyMacroProvider.sendKey(text)
  }

  const dispatch: Methods["dispatch"] = async (value) => {
    if (value.startsWith("type://")) {
      const inner = value.slice("type://".length)
      if (inner.length === 0) {
        throw new NotImplementedError(
          "dispatch: type:// requires a value, e.g. type://ctrl+c",
        )
      }
      let macro = inner
      if (inner.startsWith("{")) {
        let parsed: unknown
        try {
          parsed = JSON.parse(inner)
        } catch {
          throw new NotImplementedError(
            "dispatch: type://{...} payload is not valid JSON",
          )
        }
        if (typeof parsed !== "object" || parsed === null) {
          throw new NotImplementedError(
            "dispatch: type://{...} payload must be a JSON object",
          )
        }
        const variants = parsed as Record<string, unknown>
        const platKey =
          process.platform === "darwin"
            ? "osx"
            : process.platform === "win32"
              ? "windows"
              : "linux"
        const pick =
          typeof variants[platKey] === "string"
            ? (variants[platKey] as string)
            : typeof variants.all === "string"
              ? (variants.all as string)
              : undefined
        if (pick === undefined || pick.length === 0) {
          throw new NotImplementedError(
            `dispatch: type://{...} has no value for platform '${process.platform}' and no 'all' fallback`,
          )
        }
        macro = pick
      }
      await dispatchMacro(macro, { runCommand, keyMacro })
      return
    }
    if (value.startsWith("brightness://")) {
      const inner = value.slice("brightness://".length)
      if (inner === "up" || inner === "down") {
        adjustBrightness({ direction: inner })
        return
      }
      throw new NotImplementedError(
        `dispatch: brightness:// requires up/down, got '${inner}'`,
      )
    }
    await runCommand(value)
  }

  return {
    runCommand,
    keyMacro,
    typeText,
    dispatch,
    navigateToDeck,
    goBack,
    getActiveDeckId,
    invalidate,
    publish,
    subscribe,
    setKeyMacroProvider,
    setRequirements,
    checkRequirement,
    showTemporaryError,
    adjustBrightness,
  }
}

export const deckFromRuntimeDeck = (deck: RuntimeDeck) => deck
