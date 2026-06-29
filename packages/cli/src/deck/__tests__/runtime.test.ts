import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPubSub } from "@/core/pub-sub";
import { createStore } from "@/core/store";
import { createLogger } from "@/util/logger";
import type { ActiveAppProvider, ActiveAppSnapshot } from "@/system/provider";

import { createRuntime, type RuntimeDeck } from "../runtime";

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

interface FakeProvider extends Pick<ActiveAppProvider, "getActive" | "stop"> {
  snapshot: ActiveAppSnapshot | null;
  getActive: () => Promise<ActiveAppSnapshot | null>;
  stop: () => Promise<void>;
  calls: { getActive: number; stop: number };
}

const makeFakeProvider = (initial: ActiveAppSnapshot | null): FakeProvider => {
  const provider: FakeProvider = {
    snapshot: initial,
    calls: { getActive: 0, stop: 0 },
    async getActive() {
      provider.calls.getActive += 1;
      return provider.snapshot;
    },
    async stop() {
      provider.calls.stop += 1;
    },
  };
  return provider;
};

const flush = async (ms = 5): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
};

describe("createRuntime with active-app provider", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("setActiveAppProvider starts the poll loop", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome", processNames: ["chrome"] }),
    ]);
    const provider = makeFakeProvider({ name: "Google Chrome", windowTitle: null, processId: 1 });
    runtime.setActiveAppProvider(provider);
    await flush(1_200);
    expect(provider.calls.getActive).toBeGreaterThan(0);
    await runtime.stopActiveAppPolling();
  });

  it("overlay switches to deck whose processNames match", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ]);
    const provider = makeFakeProvider({ name: "Google Chrome", windowTitle: null, processId: 1 });
    runtime.setActiveAppProvider(provider);
    await flush(1_200);
    expect(runtime.getOverlay()?.id).toBe("chrome-deck");
    await runtime.stopActiveAppPolling();
  });

  it("overlay clears when active-app no longer matches", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ]);
    const provider = makeFakeProvider({ name: "Google Chrome", windowTitle: null, processId: 1 });
    runtime.setActiveAppProvider(provider);
    await flush(1_200);
    expect(runtime.getOverlay()?.id).toBe("chrome-deck");
    provider.snapshot = { name: "Firefox", windowTitle: null, processId: 2 };
    await flush(1_500);
    expect(runtime.getOverlay()).toBeNull();
    await runtime.stopActiveAppPolling();
  });

  it("first matching deck wins when multiple match", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "first-match", processNames: ["chrome", "*firefox*"] }),
      makeDeck({ id: "second-match", processNames: ["*chrome*"] }),
    ]);
    const provider = makeFakeProvider({ name: "Google Chrome", windowTitle: null, processId: 1 });
    runtime.setActiveAppProvider(provider);
    await flush(1_200);
    expect(runtime.getOverlay()?.id).toBe("first-match");
    await runtime.stopActiveAppPolling();
  });

  it("stopActiveAppPolling stops the provider", async () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })]);
    const provider = makeFakeProvider(null);
    runtime.setActiveAppProvider(provider);
    await flush(100);
    await runtime.stopActiveAppPolling();
    expect(provider.calls.stop).toBe(1);
  });
});
