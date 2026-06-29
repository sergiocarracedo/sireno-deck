import { describe, expect, it } from "vitest";

import { isSirenoAddon } from "@/addon/api-types.ts";

import { sessionAddon } from "../index.ts";

describe("session addon", () => {
  it("addon object validates via isSirenoAddon", () => {
    expect(isSirenoAddon(sessionAddon)).toBe(true);
  });

  it("createDecks returns a session:locked deck with 5 time buttons", () => {
    const def = sessionAddon.decks?.[0];
    expect(def).toBeDefined();
    const result = def!.createDecks({ config: {} as never });
    const deck = result["session:locked"];
    expect(deck).toBeDefined();
    const buttons = (deck!.buttons ?? []) as Array<{ id?: string; type: string; config?: unknown }>;
    expect(buttons).toHaveLength(5);
    expect(buttons.every((b) => b.type === "session:time")).toBe(true);
  });

  it("time button defaults format to HH:mm when timeFormat is HH:mm", () => {
    const def = sessionAddon.decks?.[0];
    expect(def).toBeDefined();
    const result = def!.createDecks({ config: { timeFormat: "HH:mm" } });
    const buttons = result["session:locked"]!.buttons as Array<{
      id?: string;
      type: string;
      config?: unknown;
    }>;
    const btn = buttons[0]!;
    expect((btn.config as { format: string }).format).toBe("HH:mm");
  });
});
