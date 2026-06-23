import type pino from "pino";

import type { PubSub } from "@/core/pub-sub.ts";
import type { Store } from "@/core/store.ts";
import { NotImplementedError } from "@/util/errors.ts";

import type { ActionExecutor, ActionExecutorOptions } from "@/action/executor.ts";
import type { Runtime, RuntimeDeck } from "./runtime.ts";

export interface KeyMacroAction {
  kind: "key" | "combo" | "text";
  value: string;
  modifiers?: ReadonlyArray<"shift" | "ctrl" | "alt" | "meta" | "cmd">;
}

export interface MethodsContext {
  runtime: Runtime;
  pubSub: PubSub;
  store: Store;
  executor: ActionExecutor;
  logger: pino.Logger;
}

export interface Methods {
  runCommand(
    command: string,
    options?: ActionExecutorOptions,
  ): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }>;
  keyMacro(action: KeyMacroAction): Promise<void>;
  pasteText(text: string): Promise<void>;
  navigateToDeck(args: { id: string; addToHistory?: boolean }): void;
  goBack(): void;
  getActiveDeckId(): string;
  invalidate(): void;
  publish<T>(channel: string, payload: T): void;
  subscribe<T>(channel: string, cb: (payload: T) => void): () => void;
}

export const createMethods = (ctx: MethodsContext): Methods => {
  const navigateToDeck: Methods["navigateToDeck"] = (args) => {
    ctx.runtime.navigateToDeck(args.id, { addToHistory: args.addToHistory });
  };

  const goBack: Methods["goBack"] = () => {
    ctx.runtime.goBack();
  };

  const getActiveDeckId: Methods["getActiveDeckId"] = () => {
    return ctx.runtime.getActiveDeckId();
  };

  const invalidate: Methods["invalidate"] = () => {
    ctx.runtime.invalidate();
  };

  const publish: Methods["publish"] = <T>(channel: string, payload: T) => {
    ctx.pubSub.publish<T>(channel, payload);
  };

  const subscribe: Methods["subscribe"] = <T>(channel: string, cb: (payload: T) => void) => {
    return ctx.pubSub.subscribe<T>(channel, cb);
  };

  const runCommand: Methods["runCommand"] = async (command, options) => {
    return await ctx.executor.run(command, options);
  };

  const keyMacro: Methods["keyMacro"] = async () => {
    throw new NotImplementedError("methods.keyMacro (Phase 07 OS providers)");
  };

  const pasteText: Methods["pasteText"] = async () => {
    throw new NotImplementedError("methods.pasteText (Phase 07 OS providers)");
  };

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
  };
};

export const deckFromRuntimeDeck = (deck: RuntimeDeck) => deck;
