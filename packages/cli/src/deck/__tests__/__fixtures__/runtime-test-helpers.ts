import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"
import { createLogger } from "@/util/logger"
import { createActionExecutor } from "@/action/executor"

import { createRuntime, type RuntimeDeck } from "../../runtime"
import { createMethods } from "../../methods"
import { getHostContext } from "../../host-context"

export const silentLogger = () => createLogger({ level: "silent" })

export const makeDeck = (
  overrides: Partial<RuntimeDeck> = {},
): RuntimeDeck => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
})

export const setupRuntimeWithMethods = (decks: ReadonlyArray<RuntimeDeck>) => {
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
  return { runtime, pubSub, store, methods, executor }
}
