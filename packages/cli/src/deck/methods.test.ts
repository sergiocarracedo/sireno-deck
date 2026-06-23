import { describe, expect, it, vi } from "vitest";

import { createPubSub } from "@/core/pub-sub.ts";
import { createStore } from "@/core/store.ts";
import { createLogger } from "@/util/logger.ts";

import { createActionExecutor } from "@/action/executor.ts";
import { getHostContext } from "./host-context.ts";
import { createMethods } from "./methods.ts";
import { createRuntime, type RuntimeDeck } from "./runtime.ts";

const silentLogger = () => createLogger({ level: "silent" });

const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub();
  const store = createStore();
  const runtime = createRuntime({ decks, pubSub, store, logger: silentLogger() });
  const executor = createActionExecutor({ host: getHostContext() });
  const methods = createMethods({ runtime, pubSub, store, executor, logger: silentLogger() });
  return { runtime, pubSub, store, methods };
};

describe("createMethods", () => {
  it("navigateToDeck pushes and changes active", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
      { id: "media", name: "Media", buttons: [] },
    ]);
    methods.navigateToDeck({ id: "media" });
    expect(runtime.getActiveDeckId()).toBe("media");
  });

  it("goBack pops nav stack", () => {
    const { methods, runtime } = setup([
      { id: "main", name: "Main", buttons: [], isMain: true },
      { id: "media", name: "Media", buttons: [] },
    ]);
    methods.navigateToDeck({ id: "media" });
    methods.goBack();
    expect(runtime.getActiveDeckId()).toBe("main");
  });

  it("getActiveDeckId returns current deck", () => {
    const { methods, runtime } = setup([{ id: "main", name: "Main", buttons: [], isMain: true }]);
    expect(methods.getActiveDeckId()).toBe(runtime.getActiveDeckId());
  });

  it("publish + subscribe roundtrip", () => {
    const { methods } = setup([{ id: "main", name: "Main", buttons: [], isMain: true }]);
    const cb = vi.fn();
    methods.subscribe<number>("test", cb);
    methods.publish("test", 42);
    expect(cb).toHaveBeenCalledWith(42);
  });

  it("keyMacro throws NotImplementedError", async () => {
    const { methods } = setup([{ id: "main", name: "Main", buttons: [], isMain: true }]);
    await expect(methods.keyMacro({ kind: "key", value: "a" })).rejects.toThrow(/Not implemented/);
  });

  it("pasteText throws NotImplementedError", async () => {
    const { methods } = setup([{ id: "main", name: "Main", buttons: [], isMain: true }]);
    await expect(methods.pasteText("hi")).rejects.toThrow(/Not implemented/);
  });
});
