/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChannelRegistry } from "../registry";
import { useAddonChannel } from "../use-addon-channel";
import { useDeck } from "../use-deck";

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

describe("ChannelRegistry announceSubscribe", () => {
  it("announces channel on first subscriber (0→1)", async () => {
    const announced: string[] = [];
    ChannelRegistry.setAnnounceSubscribe((channels) => {
      announced.push(...channels);
    });
    const { unmount } = renderHook(() => useAddonChannel<number>("weather:current"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toEqual(["weather:current"]);
    unmount();
    ChannelRegistry.setAnnounceSubscribe(null);
  });

  it("does not re-announce on second subscriber (1→2)", async () => {
    const announced: string[] = [];
    ChannelRegistry.setAnnounceSubscribe((channels) => {
      announced.push(...channels);
    });
    const { unmount: u1 } = renderHook(() => useAddonChannel<number>("shared"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toEqual(["shared"]);
    const { unmount: u2 } = renderHook(() => useAddonChannel<number>("shared"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toEqual(["shared"]);
    u1();
    u2();
    ChannelRegistry.setAnnounceSubscribe(null);
  });

  it("re-announces after all listeners unmount and a new one mounts", async () => {
    const announced: string[] = [];
    ChannelRegistry.setAnnounceSubscribe((channels) => {
      announced.push(...channels);
    });
    const { unmount } = renderHook(() => useAddonChannel<number>("cycle"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toEqual(["cycle"]);
    unmount();
    const { unmount: u2 } = renderHook(() => useAddonChannel<number>("cycle"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toEqual(["cycle", "cycle"]);
    u2();
    ChannelRegistry.setAnnounceSubscribe(null);
  });

  it("batches multiple channels via microtask flush", async () => {
    const announced: string[][] = [];
    ChannelRegistry.setAnnounceSubscribe((channels) => {
      announced.push(channels);
    });
    const { unmount: u1 } = renderHook(() => useAddonChannel<number>("a"));
    const { unmount: u2 } = renderHook(() => useAddonChannel<number>("b"));
    const { unmount: u3 } = renderHook(() => useAddonChannel<number>("c"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announced).toHaveLength(1);
    expect(announced[0]).toEqual(expect.arrayContaining(["a", "b", "c"]));
    u1();
    u2();
    u3();
    ChannelRegistry.setAnnounceSubscribe(null);
  });
});
