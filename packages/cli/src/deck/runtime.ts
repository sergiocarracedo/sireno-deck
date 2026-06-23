import type pino from "pino";

import type { PubSub } from "@/core/pub-sub.ts";
import type { Store } from "@/core/store.ts";
import type { GestureKind } from "@/core/gesture-state.ts";

export interface RuntimeDeck {
  id: string;
  name: string;
  buttons: ReadonlyArray<{ id: string; type: string; config?: unknown }>;
  isMain?: boolean;
  isOverlay?: boolean;
  processNames?: ReadonlyArray<string>;
  windowNames?: ReadonlyArray<string>;
  autoShow?: boolean;
}

export interface RuntimeButtonHandler {
  onTap?: (ctx: ButtonActionContext) => void | Promise<void>;
  onDblTap?: (ctx: ButtonActionContext) => void | Promise<void>;
  onHold?: (ctx: ButtonActionContext) => void | Promise<void>;
  dispose?: () => void | Promise<void>;
}

export interface ButtonActionContext {
  buttonId: string;
  deckId: string;
  config: unknown;
  gesture: GestureKind;
}

export interface MountedButton {
  addonName: string;
  buttonId: string;
  type: string;
  config: unknown;
}

export interface CreateRuntimeOptions {
  decks: ReadonlyArray<RuntimeDeck>;
  pubSub: PubSub;
  store: Store;
  logger: pino.Logger;
}

export interface Runtime {
  getActiveDeck(): RuntimeDeck;
  getActiveDeckId(): string;
  navigateToDeck(id: string, options?: { addToHistory?: boolean }): void;
  goBack(): void;
  setOverlay(deckId: string | null): void;
  getOverlay(): RuntimeDeck | null;
  registerButtonHandler(buttonId: string, handler: RuntimeButtonHandler): void;
  mountAddonButtons(addonName: string, buttons: ReadonlyArray<MountedButton>): void;
  dispatchGesture(buttonId: string, gesture: GestureKind): Promise<void>;
  invalidate(): void;
  navStackDepth(): number;
}

export const createRuntime = (options: CreateRuntimeOptions): Runtime => {
  const { decks, pubSub, store, logger } = options;
  const mainDeck = decks.find((d) => d.isMain) ?? decks[0];
  if (mainDeck === undefined) {
    throw new Error("createRuntime: at least one deck is required");
  }

  const handlers = new Map<string, RuntimeButtonHandler>();
  const navStack: string[] = [mainDeck.id];
  let transientDeckId: string | null = null;
  let overlayDeckId: string | null = null;

  const deckById = (id: string): RuntimeDeck | undefined => decks.find((d) => d.id === id);

  const findButton = (
    id: string,
  ): { deckId: string; button: RuntimeDeck["buttons"][number] } | null => {
    for (const deck of decks) {
      const button = deck.buttons.find((b) => b.id === id);
      if (button !== undefined) return { deckId: deck.id, button };
    }
    return null;
  };

  const getActiveDeck = (): RuntimeDeck => {
    const id = transientDeckId ?? navStack[navStack.length - 1] ?? mainDeck.id;
    const deck = deckById(id);
    if (deck === undefined) throw new Error(`Active deck '${id}' not found`);
    return deck;
  };

  const getActiveDeckId = (): string => {
    return transientDeckId ?? navStack[navStack.length - 1] ?? mainDeck.id;
  };

  const navigateToDeck = (id: string, navOptions?: { addToHistory?: boolean }): void => {
    if (id === getActiveDeckId()) return;
    const target = deckById(id);
    if (target === undefined) {
      logger.warn({ deckId: id }, "navigateToDeck: deck not found");
      return;
    }
    if (navOptions?.addToHistory === false) {
      transientDeckId = id;
    } else {
      navStack.push(id);
      transientDeckId = null;
    }
    pubSub.publish("runtime:activeDeck", { deckId: id });
  };

  const goBack = (): void => {
    if (transientDeckId !== null) {
      transientDeckId = null;
      const prev = navStack[navStack.length - 1] ?? mainDeck.id;
      pubSub.publish("runtime:activeDeck", { deckId: prev });
      return;
    }
    if (navStack.length <= 1) {
      logger.warn("goBack: at root deck; nothing to pop");
      return;
    }
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    if (prev === undefined) return;
    pubSub.publish("runtime:activeDeck", { deckId: prev });
  };

  const setOverlay = (deckId: string | null): void => {
    if (deckId !== null && deckById(deckId) === undefined) {
      logger.warn({ deckId }, "setOverlay: deck not found");
      return;
    }
    overlayDeckId = deckId;
    pubSub.publish("runtime:overlay", { deckId });
  };

  const getOverlay = (): RuntimeDeck | null => {
    if (overlayDeckId === null) return null;
    return deckById(overlayDeckId) ?? null;
  };

  const registerButtonHandler = (buttonId: string, handler: RuntimeButtonHandler): void => {
    handlers.set(buttonId, handler);
  };

  const mountAddonButtons = (addonName: string, buttons: ReadonlyArray<MountedButton>): void => {
    for (const btn of buttons) {
      logger.debug({ addonName, buttonId: btn.buttonId, type: btn.type }, "mounted addon button");
    }
  };

  const dispatchGesture = async (buttonId: string, gesture: GestureKind): Promise<void> => {
    const found = findButton(buttonId);
    if (found === null) {
      logger.warn({ buttonId }, "dispatchGesture: button not found");
      return;
    }
    const handler = handlers.get(buttonId);
    if (handler === undefined) {
      logger.warn({ buttonId }, "dispatchGesture: no handler registered");
      return;
    }
    const ctx: ButtonActionContext = {
      buttonId,
      deckId: found.deckId,
      config: found.button.config,
      gesture,
    };
    const fn =
      gesture === "tap" ? handler.onTap : gesture === "dbl-tap" ? handler.onDblTap : handler.onHold;
    if (fn === undefined) {
      logger.warn({ buttonId, gesture }, "dispatchGesture: handler missing for gesture");
      return;
    }
    await fn(ctx);
  };

  const invalidate = (): void => {
    pubSub.publish("runtime:invalidate", { activeDeckId: getActiveDeckId() });
  };

  void store;

  const runtime: Runtime = {
    getActiveDeck,
    getActiveDeckId,
    navigateToDeck,
    goBack,
    setOverlay,
    getOverlay,
    registerButtonHandler,
    mountAddonButtons,
    dispatchGesture,
    invalidate,
    navStackDepth: () => navStack.length,
  };

  return runtime;
};
