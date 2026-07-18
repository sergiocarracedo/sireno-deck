import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { createLogger } from "@/util/logger"
import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"

import { createActionExecutor } from "@/action/executor"
import { getHostContext } from "../host-context"
import { createMethods } from "../methods"
import { createRuntime } from "../runtime"

import { materializeAddonDecks } from "@/cli/commands/addon-decks"
import { coreAddon } from "@/builtin-addons/core"

const silentLogger = () => createLogger({ level: "silent" })

describe("materializeAddonDecks registers core:lock", () => {
  it("registers core:lock as a real deck when the core addon is loaded", () => {
    const registry = new AddonRegistry()
    registry.load(coreAddon)
    const decks = materializeAddonDecks(
      registry,
      [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      silentLogger(),
      15,
    )
    expect(decks.map((d) => d.id)).toContain("core:lock")
    const coreLock = decks.find((d) => d.id === "core:lock")
    expect(coreLock).toBeDefined()
    expect(coreLock?.buttons.length).toBe(3)
    expect(coreLock?.buttons.every((b) => b.type === "date-time:date-time")).toBe(
      true,
    )
  })

  it("uses user lockButtons when passed", () => {
    const registry = new AddonRegistry()
    registry.load(coreAddon)
    const userButtons = [
      { type: "core:change-deck", position: 0, config: { deck: "system" } },
    ]
    const decks = materializeAddonDecks(
      registry,
      [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      silentLogger(),
      15,
      userButtons,
    )
    const coreLock = decks.find((d) => d.id === "core:lock")
    expect(coreLock?.buttons.length).toBe(1)
    expect(coreLock?.buttons[0]?.type).toBe("core:change-deck")
  })

  it("navigateToDeck(\"core:lock\") finds it via deckById after materialization", async () => {
    const registry = new AddonRegistry()
    registry.load(coreAddon)
    const decks = materializeAddonDecks(
      registry,
      [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      silentLogger(),
      15,
    )
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

    expect(runtime.getActiveDeckId()).toBe("main")
    runtime.navigateToDeck("core:lock")
    expect(runtime.getActiveDeckId()).toBe("core:lock")
    expect(runtime.isLockActive()).toBe(false)
  })
})