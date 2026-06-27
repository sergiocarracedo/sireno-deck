import type pino from "pino";

import { createPubSub } from "@/core/pub-sub.ts";
import { createStore } from "@/core/store.ts";
import { NotImplementedError } from "@/util/errors.ts";
import { createLogger } from "@/util/logger.ts";
import type { KeyMacroProvider } from "@/system/provider";

import { createActionExecutor } from "@/action/executor.ts";
import { getHostContext } from "./host-context.ts";
import { createMethods } from "./methods.ts";
import { createRuntime, type Runtime, type RuntimeDeck } from "./runtime.ts";

export { createActionExecutor, type ActionExecutor } from "@/action/executor.ts";
export {
  createMethods,
  type Methods,
  type MethodsContext,
  type KeyMacroAction,
} from "./methods.ts";
export {
  createRuntime,
  type Runtime,
  type RuntimeDeck,
  type RuntimeButtonHandler,
  type ButtonActionContext,
  type MountedButton,
} from "./runtime.ts";
export { getHostContext, type HostContext } from "./host-context.ts";
export { computeSystemButtonForSlotN1 } from "./system-back-injection.ts";
export {
  isSystemButtonType,
  SYSTEM_BUTTON_TYPES,
  type SystemButtonType,
} from "./system-buttons/types.ts";

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
