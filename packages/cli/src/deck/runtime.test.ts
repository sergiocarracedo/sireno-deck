import { describe, expect, it, vi } from "vitest";

import { createPubSub } from "@/core/pub-sub.ts";
import { createStore } from "@/core/store.ts";
import { createLogger } from "@/util/logger.ts";

import { createRuntime, type RuntimeDeck } from "./runtime.ts";

const silentLogger = () => createLogger({ level: "silent" });

const makeDeck = (overrides: Partial<RuntimeDeck> = {}): RuntimeDeck => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
});

const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub();
  const store = createStore();
  const runtime = createRuntime({ decks, pubSub, store, logger: silentLogger() });
  return { runtime, pubSub, store };
};

describe("createRuntime", () => {
  it("initial active deck = main", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "media" }),
    ]);
    expect(runtime.getActiveDeckId()).toBe("main");
  });

  it("navigateToDeck pushes to nav stack", () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true }), makeDeck({ id: "media" })]);
    runtime.navigateToDeck("media");
    expect(runtime.getActiveDeckId()).toBe("media");
    expect(runtime.navStackDepth()).toBe(2);
  });

  it("goBack pops nav stack", () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true }), makeDeck({ id: "media" })]);
    runtime.navigateToDeck("media");
    runtime.goBack();
    expect(runtime.getActiveDeckId()).toBe("main");
    expect(runtime.navStackDepth()).toBe(1);
  });

  it("goBack at root is a no-op", () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })]);
    runtime.goBack();
    expect(runtime.getActiveDeckId()).toBe("main");
  });

  it("setOverlay + getOverlay roundtrip", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "spotify", isOverlay: true }),
    ]);
    runtime.setOverlay("spotify");
    expect(runtime.getOverlay()?.id).toBe("spotify");
    runtime.setOverlay(null);
    expect(runtime.getOverlay()).toBeNull();
  });

  it("dispatchGesture tap calls registered onTap", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [{ id: "b1", type: "x" }] }),
    ]);
    const onTap = vi.fn();
    runtime.registerButtonHandler("b1", { onTap });
    await runtime.dispatchGesture("b1", "tap");
    expect(onTap).toHaveBeenCalledWith(
      expect.objectContaining({ buttonId: "b1", deckId: "main", gesture: "tap" }),
    );
  });

  it("dispatchGesture dbl-tap calls onDblTap", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [{ id: "b1", type: "x" }] }),
    ]);
    const onDblTap = vi.fn();
    runtime.registerButtonHandler("b1", { onDblTap });
    await runtime.dispatchGesture("b1", "dbl-tap");
    expect(onDblTap).toHaveBeenCalledOnce();
  });

  it("dispatchGesture hold calls onHold", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [{ id: "b1", type: "x" }] }),
    ]);
    const onHold = vi.fn();
    runtime.registerButtonHandler("b1", { onHold });
    await runtime.dispatchGesture("b1", "hold");
    expect(onHold).toHaveBeenCalledOnce();
  });

  it("dispatchGesture missing handler is a no-op", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [{ id: "b1", type: "x" }] }),
    ]);
    await expect(runtime.dispatchGesture("b1", "tap")).resolves.toBeUndefined();
  });

  it("dispatchGesture missing button is a no-op", async () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })]);
    await expect(runtime.dispatchGesture("missing", "tap")).resolves.toBeUndefined();
  });

  it("navigateToDeck with addToHistory=false doesn't push", () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true }), makeDeck({ id: "media" })]);
    runtime.navigateToDeck("media", { addToHistory: false });
    expect(runtime.getActiveDeckId()).toBe("media");
    expect(runtime.navStackDepth()).toBe(1);
    runtime.goBack();
    expect(runtime.getActiveDeckId()).toBe("main");
  });
});
