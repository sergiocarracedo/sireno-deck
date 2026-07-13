import { describe, expect, it, vi } from "vitest"

import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"
import { createLogger } from "@/util/logger"

import { createActionExecutor } from "@/action/executor"
import { getHostContext } from "../host-context"
import { createMethods } from "../methods"
import { createRuntime, type RuntimeDeck } from "../runtime"

const silentLogger = () => createLogger({ level: "silent" })

const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub()
  const store = createStore()
  const executor = createActionExecutor({ host: getHostContext() })
  const methodsRef: { current: ReturnType<typeof createMethods> | undefined } =
    { current: undefined }
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
    getMethods: () => methodsRef.current!,
  })
  const methods = createMethods({
    runtime,
    pubSub,
    store,
    executor,
    logger: silentLogger(),
  })
  methodsRef.current = methods
  return { runtime, pubSub, store, methods }
}

describe("createMethods", () => {
  it("navigateToDeck pushes and changes active", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
      { id: "media", name: "Media", buttons: [] },
    ])
    methods.navigateToDeck({ id: "media" })
    expect(runtime.getActiveDeckId()).toBe("media")
  })

  it("goBack pops nav stack", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
      { id: "media", name: "Media", buttons: [] },
    ])
    methods.navigateToDeck({ id: "media" })
    methods.goBack()
    expect(runtime.getActiveDeckId()).toBe("main")
  })

  it("getActiveDeckId returns current deck", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    expect(methods.getActiveDeckId()).toBe(runtime.getActiveDeckId())
  })

  it("publish + subscribe roundtrip", () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const cb = vi.fn()
    methods.subscribe<number>("test", cb)
    methods.publish("test", 42)
    expect(cb).toHaveBeenCalledWith(42)
  })

  it("keyMacro throws NotImplementedError without a provider", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.keyMacro({ kind: "key", value: "a" })).rejects.toThrow(
      /Not implemented/,
    )
  })

  it("keyMacro calls the provider's sendKey when wired", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.keyMacro({ kind: "key", value: "a" })
    expect(sendKey).toHaveBeenCalledWith("a")
  })

  it("keyMacro parses combos", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.keyMacro({ kind: "combo", value: "ctrl+c" })
    expect(sendKey).toHaveBeenCalledWith("ctrl+c")
  })

  it("pasteText throws NotImplementedError (no clipboard provider)", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.pasteText("hi")).rejects.toThrow(/clipboardProvider/)
  })
  it("pasteText calls the provider's writeText when wired", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const writeText = vi.fn().mockResolvedValue(undefined)
    methods.setClipboardProvider({
      writeText,
      readText: async () => "",
      stop: async () => undefined,
    })
    await methods.pasteText("hello")
    expect(writeText).toHaveBeenCalledWith("hello")
  })

  it("dispatch routes macro:// to keyMacro", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.dispatch("macro://ctrl+c")
    expect(sendKey).toHaveBeenCalledWith("ctrl+c")
  })

  it("dispatch routes paste:// to pasteText", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const writeText = vi.fn().mockResolvedValue(undefined)
    methods.setClipboardProvider({
      writeText,
      readText: async () => "",
      stop: async () => undefined,
    })
    await methods.dispatch("paste://🔥")
    expect(writeText).toHaveBeenCalledWith("🔥")
  })

  it("runCommand returns stdout", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const result = await methods.runCommand("echo hello")
    expect(result.stdout.trim()).toBe("hello")
  })

  it("dispatch throws for empty macro:// value", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.dispatch("macro://")).rejects.toThrow(
      new RegExp("macro:// requires a value"),
    )
  })

  it("dispatch runs macro with delay", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.dispatch("macro://ctrl+t;delay(50ms);ctrl+v")
    expect(sendKey).toHaveBeenCalledTimes(2)
    expect(sendKey).toHaveBeenNthCalledWith(1, "ctrl+t")
    expect(sendKey).toHaveBeenNthCalledWith(2, "ctrl+v")
  })
})
