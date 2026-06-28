/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChannelRegistry } from "./registry.ts";
import { useAddonChannel } from "./use-addon-channel.ts";
import { useDeck } from "./use-deck.ts";

beforeEach(() => ChannelRegistry.resetForTests());
afterEach(() => ChannelRegistry.resetForTests());

describe("useAddonChannel", () => {
  it("returns undefined when no payload has been published", () => {
    const { result } = renderHook(() => useAddonChannel<number>("missing"));
    expect(result.current.data).toBeUndefined();
  });

  it("updates when a payload is published", () => {
    const { result } = renderHook(() => useAddonChannel<number>("a"));
    expect(result.current.data).toBeUndefined();
    act(() => {
      ChannelRegistry.instance().publish("a", 42);
    });
    expect(result.current.data).toBe(42);
  });

  it("unsubscribes on unmount without throwing", () => {
    const { unmount } = renderHook(() => useAddonChannel<number>("a"));
    act(() => {
      ChannelRegistry.instance().publish("a", 1);
    });
    unmount();
    expect(() => {
      act(() => {
        ChannelRegistry.instance().publish("a", 2);
      });
    }).not.toThrow();
  });
});

describe("useDeck", () => {
  it("returns null when no active deck has been published", () => {
    const { result } = renderHook(() => useDeck());
    expect(result.current.activeDeckId).toBeNull();
  });

  it("returns active deck id after publish", () => {
    const { result } = renderHook(() => useDeck());
    act(() => {
      ChannelRegistry.instance().publish("runtime:activeDeck", { deckId: "main" });
    });
    expect(result.current.activeDeckId).toBe("main");
  });
});
