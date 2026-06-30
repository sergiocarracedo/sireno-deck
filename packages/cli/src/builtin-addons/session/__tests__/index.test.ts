import { describe, expect, it } from "vitest";

import { sessionAddon } from "../index";

describe("session addon", () => {
  it("manifest declares apiVersion 3 and the expected name", () => {
    expect(sessionAddon.apiVersion).toBe(3);
    expect(sessionAddon.name).toBe("session");
  });

  it("createDecks returns a session:locked deck with 5 time buttons", () => {
    const factory = sessionAddon.decks?.["session:locked"];
    expect(factory).toBeDefined();
    const deck = factory!(0);
    expect(deck.name).toBe("Locked");
    const buttons = (deck.buttons ?? []) as Array<{ type: string }>;
    expect(buttons).toHaveLength(5);
    expect(buttons.every((b) => b.type === "session:time")).toBe(true);
  });
});
