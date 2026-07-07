import { describe, expect, it } from "vitest";

import type { RuntimeDeck } from "@/deck/runtime";

import { buildDeckConfigMessage, type AddonFrontendRef } from "../emulator-mode";

const deck: RuntimeDeck = {
  id: "main",
  name: "Main",
  isMain: true,
  buttons: [
    { id: "2", type: "date-time:time", config: { variant: "big" } },
    { id: "3", type: "date-time:date" },
    { id: "unknown", type: "core:custom" },
  ],
};

describe("buildDeckConfigMessage", () => {
  it("includes addonName and frontendEntry when the type is registered", () => {
    const addonByType: Map<string, AddonFrontendRef> = new Map([
      ["date-time:time", { name: "date-time", frontendEntry: "/abs/date-time/frontend" }],
      ["date-time:date", { name: "date-time", frontendEntry: "/abs/date-time/frontend" }],
    ]);
    const msg = buildDeckConfigMessage(deck, addonByType);
    const buttons = msg.surfaces["main"]!.buttons;
    expect(buttons[0]).toMatchObject({
      id: "2",
      type: "date-time:time",
      addonName: "date-time",
      frontendEntry: "/abs/date-time/frontend",
    });
    expect(buttons[1]).toMatchObject({
      id: "3",
      type: "date-time:date",
      addonName: "date-time",
      frontendEntry: "/abs/date-time/frontend",
    });
  });

  it("omits addon metadata when the type is unknown", () => {
    const msg = buildDeckConfigMessage(deck, new Map());
    const buttons = msg.surfaces["main"]!.buttons;
    expect(buttons[2]).not.toHaveProperty("addonName");
    expect(buttons[2]).not.toHaveProperty("frontendEntry");
  });

  it("omits frontendEntry when the addon has no frontend", () => {
    const addonByType: Map<string, AddonFrontendRef> = new Map([
      ["custom-addon:custom", { name: "custom-addon", frontendEntry: null }],
    ]);
    const msg = buildDeckConfigMessage(deck, addonByType);
    const buttons = msg.surfaces["main"]!.buttons;
    expect(buttons[2]).toMatchObject({ addonName: "custom-addon" });
    expect(buttons[2]).not.toHaveProperty("frontendEntry");
  });

  it("preserves the position field", () => {
    const msg = buildDeckConfigMessage(deck, new Map());
    const buttons = msg.surfaces["main"]!.buttons;
    expect(buttons[0]?.position).toBe(2);
    expect(buttons[1]?.position).toBe(3);
    expect(buttons[2]).not.toHaveProperty("position");
  });
});
