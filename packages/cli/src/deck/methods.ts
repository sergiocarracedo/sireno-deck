import type pino from "pino"

import type { PubSub } from "@/core/pub-sub"
import type { Store } from "@/core/store"
import { NotImplementedError } from "@/util/errors"
import {
  isValidKey,
  knownKeys,
  parseCombo,
  type ParsedCombo,
} from "@/system/key-macro/parser"

import type { ActionExecutor, ActionExecutorOptions } from "@/action/executor"
import type { ClipboardProvider, KeyMacroProvider } from "@/system/provider"
import type { Runtime, RuntimeDeck } from "./runtime"

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
  clipboardProvider?: ClipboardProvider
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
  keyMacro(action: KeyMacroAction): Promise<void>
  pasteText(text: string): Promise<void>
  navigateToDeck(args: { id: string; addToHistory?: boolean }): void
  goBack(): void
  getActiveDeckId(): string
  invalidate(): void
  publish<T>(channel: string, payload: T): void
  subscribe<T>(channel: string, cb: (payload: T) => void): () => void
  setKeyMacroProvider(provider: KeyMacroProvider): void
  setClipboardProvider(provider: ClipboardProvider): void
}

export const createMethods = (ctx: MethodsContext): Methods => {
  let keyMacroProvider: KeyMacroProvider | undefined = ctx.keyMacroProvider
  let clipboardProvider: ClipboardProvider | undefined = ctx.clipboardProvider
  const setKeyMacroProvider: Methods["setKeyMacroProvider"] = (provider) => {
    keyMacroProvider = provider
  }
  const setClipboardProvider: Methods["setClipboardProvider"] = (provider) => {
    clipboardProvider = provider
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

  const pasteText: Methods["pasteText"] = async (text) => {
    if (clipboardProvider === undefined) {
      throw new NotImplementedError(
        "methods.pasteText requires a clipboardProvider (set via methods.setClipboardProvider)",
      )
    }
    await clipboardProvider.writeText(text)
  }

  return {
    runCommand,
    keyMacro,
    pasteText,
    navigateToDeck,
    goBack,
    getActiveDeckId,
    invalidate,
    publish,
    subscribe,
    setKeyMacroProvider,
    setClipboardProvider,
  }
}

export const deckFromRuntimeDeck = (deck: RuntimeDeck) => deck
