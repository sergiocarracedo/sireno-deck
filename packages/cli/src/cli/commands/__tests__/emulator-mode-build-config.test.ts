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
    { id: "unknown", type: "custom-addon:custom" },
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

  it("injects n-1 system button for main deck (settings-entry)", () => {
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
    );
    const buttons = msg.surfaces["main"]!.buttons;
    const n1Button = buttons.find((b) => b.id === "14" || b.position === 14);
    expect(n1Button).toBeDefined();
    expect(n1Button?.type).toBe("core:settings-entry");
  });

  it("injects n-1 system button for sub-deck with navStackDepth > 1 (back)", () => {
    const subDeck: RuntimeDeck = {
      id: "media",
      name: "Media",
      buttons: [{ id: "0", type: "media:player" }],
    };
    const msg = buildDeckConfigMessage(
      subDeck,
      new Map(),
      {},
      { navStackDepth: 2, hasOverlayDeckAvailable: false },
      15,
    );
    const buttons = msg.surfaces["media"]!.buttons;
    const n1Button = buttons.find((b) => b.id === "14" || b.position === 14);
    expect(n1Button).toBeDefined();
    expect(n1Button?.type).toBe("core:back");
  });

  it("injects n-1 system button for overlay deck (overlay-toggle)", () => {
    const overlayDeck: RuntimeDeck = {
      id: "emoji-overlay",
      name: "Emoji",
      isOverlay: true,
      buttons: [],
    };
    const msg = buildDeckConfigMessage(
      overlayDeck,
      new Map(),
      {},
      { navStackDepth: 3, hasOverlayDeckAvailable: true },
      15,
    );
    const buttons = msg.surfaces["emoji-overlay"]!.buttons;
    const n1Button = buttons.find((b) => b.id === "14" || b.position === 14);
    expect(n1Button).toBeDefined();
    expect(n1Button?.type).toBe("core:overlay-toggle");
  });

  it("does not inject n-1 when computeSystemButtonForSlotN1 returns null", () => {
    const subDeck: RuntimeDeck = {
      id: "media",
      name: "Media",
      buttons: [],
    };
    const msg = buildDeckConfigMessage(
      subDeck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
    );
    const buttons = msg.surfaces["media"]!.buttons;
    const n1Button = buttons.find((b) => b.id === "14" || b.position === 14);
    expect(n1Button).toBeUndefined();
  });

  it("does not inject n-1 when slot is already occupied", () => {
    const deckWithN1: RuntimeDeck = {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [{ id: "14", type: "user:custom" }],
    };
    const msg = buildDeckConfigMessage(
      deckWithN1,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
    );
    const buttons = msg.surfaces["main"]!.buttons;
    const n1Button = buttons.find((b) => b.id === "14" || b.position === 14);
    expect(n1Button?.type).toBe("user:custom");
  });
});
