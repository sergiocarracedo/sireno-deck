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

  it("typeText throws NotImplementedError without a provider", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.typeText("hi")).rejects.toThrow(/keyMacroProvider/)
  })

  it("typeText calls the provider's sendKey once with the verbatim string", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.typeText("🔥")
    expect(sendKey).toHaveBeenCalledTimes(1)
    expect(sendKey).toHaveBeenCalledWith("🔥")
  })

  it("dispatch routes macro:// to keyMacro with combos parsed", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.dispatch("macro://ctrl+c")
    expect(sendKey).toHaveBeenCalledWith("ctrl+c")
  })

  it("dispatch routes type:// plain text via keyMacro", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.dispatch("type://hello")
    expect(sendKey).toHaveBeenCalledWith("hello")
  })

  it("runCommand returns stdout", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const result = await methods.runCommand("echo hello")
    expect(result.stdout.trim()).toBe("hello")
  })

  it("dispatch throws for empty type:// value", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.dispatch("type://")).rejects.toThrow(
      /type:\/\/ requires a value/,
    )
  })

  it("showTemporaryError publishes runtime:buttonError", () => {
    const { methods, pubSub } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const cb = vi.fn()
    pubSub.subscribe("runtime:buttonError", cb)
    methods.showTemporaryError("main", 3, 2000)
    expect(cb).toHaveBeenCalledWith({
      deckId: "main",
      position: 3,
      durationMs: 2000,
    })
  })

  it("showTemporaryError forwards optional buttonId as 4th arg", () => {
    const { methods, pubSub } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const cb = vi.fn()
    pubSub.subscribe("runtime:buttonError", cb)
    methods.showTemporaryError("main", 7, undefined, "button-7")
    expect(cb).toHaveBeenCalledWith({
      deckId: "main",
      position: 7,
      durationMs: 5000,
      buttonId: "button-7",
    })
  })

  it("showTemporaryError forwards optional details as 5th arg", () => {
    const { methods, pubSub } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const cb = vi.fn()
    pubSub.subscribe("runtime:buttonError", cb)
    methods.showTemporaryError(
      "main",
      2,
      undefined,
      "button-2",
      "missing-requirement: clipboard",
    )
    expect(cb).toHaveBeenCalledWith({
      deckId: "main",
      position: 2,
      durationMs: 5000,
      buttonId: "button-2",
      details: "missing-requirement: clipboard",
    })
  })

  it("checkRequirement returns true when requirements are not set", () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    expect(methods.checkRequirement("keyMacro")).toBe(true)
  })

  it("checkRequirement returns the stored availability", () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    methods.setRequirements({
      keyMacro: {
        available: true,
        commands: ["wtype"],
        missingCommands: [],
        reason: "",
        preferred: "wtype",
      },
    })
    expect(methods.checkRequirement("keyMacro")).toBe(true)
  })

  it("checkRequirement reflects unavailable state", () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    methods.setRequirements({
      keyMacro: {
        available: false,
        commands: [],
        missingCommands: ["wtype", "osascript", "powershell"],
        reason: "no key input tool",
        preferred: "wtype",
      },
    })
    expect(methods.checkRequirement("keyMacro")).toBe(false)
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

  it("adjustBrightness up steps by 10 from runtime", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    runtime.setBrightness(70)
    methods.adjustBrightness({ direction: "up" })
    expect(runtime.getBrightness()).toBe(80)
  })

  it("adjustBrightness down clamps at 10", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    runtime.setBrightness(15)
    methods.adjustBrightness({ direction: "down" })
    expect(runtime.getBrightness()).toBe(10)
    methods.adjustBrightness({ direction: "down" })
    expect(runtime.getBrightness()).toBe(10)
  })

  it("dispatch routes brightness://up to adjustBrightness", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    runtime.setBrightness(60)
    void methods.dispatch("brightness://up")
    expect(runtime.getBrightness()).toBe(70)
  })

  it("dispatch resolves macro://{...} per-OS variant for current platform", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    const platKey =
      process.platform === "darwin"
        ? "osx"
        : process.platform === "win32"
          ? "windows"
          : "linux"
    const payload = JSON.stringify({
      all: "ctrl+x",
      osx: "cmd+x",
      linux: "ctrl+x",
      windows: "ctrl+x",
    })
    await methods.dispatch(`macro://${payload}`)
    expect(sendKey).toHaveBeenCalledWith(platKey === "osx" ? "cmd+x" : "ctrl+x")
  })

  it("dispatch falls back to macro://{...} 'all' when no platform key matches", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await methods.dispatch(`macro://${JSON.stringify({ all: "ctrl+k" })}`)
    expect(sendKey).toHaveBeenCalledWith("ctrl+k")
  })

  it("dispatch throws when macro://{...} has no platform match and no 'all'", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(
      methods.dispatch(`macro://${JSON.stringify({ osx: "cmd+k" })}`),
    ).rejects.toThrow(/no value for platform/)
  })

  it("dispatch throws when macro://{...} payload is not valid JSON", async () => {
    const { methods } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
    ])
    await expect(methods.dispatch("macro://{not-json}")).rejects.toThrow(
      /not valid JSON/,
    )
  })
})
