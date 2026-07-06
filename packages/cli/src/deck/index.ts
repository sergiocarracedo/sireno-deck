import type pino from "pino";

import { createPubSub } from "@/core/pub-sub";
import { createStore } from "@/core/store";
import { NotImplementedError } from "@/util/errors";
import { createLogger } from "@/util/logger";
import type { KeyMacroProvider } from "@/system/provider";

import { createActionExecutor } from "@/action/executor";
import { getHostContext } from "./host-context";
import { createMethods } from "./methods";
import { createRuntime, type Runtime, type RuntimeDeck } from "./runtime";

export { createActionExecutor, type ActionExecutor } from "@/action/executor";
export type { PubSub } from "@/core/pub-sub";
export type { Store } from "@/core/store";
export {
  createMethods,
  type Methods,
  type MethodsContext,
  type KeyMacroAction,
} from "./methods";
export {
  createRuntime,
  type Runtime,
  type RuntimeDeck,
  type RuntimeButtonHandler,
  type ButtonActionContext,
  type GestureEvent,
  type GestureListener,
  type MountedButton,
} from "./runtime";
export { getHostContext, type HostContext } from "./host-context";
export { computeSystemButtonForSlotN1 } from "./system-back-injection";
export {
  isSystemButtonType,
  SYSTEM_BUTTON_TYPES,
  type SystemButtonType,
} from "./system-buttons/types";

export interface CreateDeckRuntimeOptions {
  decks: ReadonlyArray<RuntimeDeck>;
  logger?: pino.Logger;
  keyMacroProvider?: KeyMacroProvider;
}

export const createDeckRuntime = (
  options: CreateDeckRuntimeOptions,
): {
  runtime: Runtime;
  methods: ReturnType<typeof createMethods>;
  pubSub: ReturnType<typeof createPubSub>;
  store: ReturnType<typeof createStore>;
} => {
  const logger = options.logger ?? createLogger({ level: "silent" });
  const pubSub = createPubSub();
  const store = createStore();
  const runtime = createRuntime({ decks: options.decks, pubSub, store, logger });
  const executor = createActionExecutor({ host: getHostContext() });
  const methods = createMethods({
    runtime,
    pubSub,
    store,
    executor,
    logger,
    ...(options.keyMacroProvider !== undefined
      ? { keyMacroProvider: options.keyMacroProvider }
      : {}),
  });
  return { runtime, methods, pubSub, store };
};

export { NotImplementedError };
