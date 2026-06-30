import { describe, expect, it } from "vitest";

import { internalSettingsAddon } from "../index";

describe("internal-settings addon", () => {
  it("manifest declares apiVersion 3 and the expected name", () => {
    expect(internalSettingsAddon.apiVersion).toBe(3);
    expect(internalSettingsAddon.name).toBe("internal-settings");
  });

  it("all three buttons have internal: true backend", () => {
    const types = Object.keys(internalSettingsAddon.buttonTypes);
    expect(types).toHaveLength(3);
    expect(types).toContain("core:settings-brightness");
    expect(types).toContain("core:settings-theme");
    expect(types).toContain("core:settings-about");
    for (const def of Object.values(internalSettingsAddon.buttonTypes)) {
      expect(def.backend.internal).toBe(true);
    }
  });

  it("settings deck factory returns the three buttons", () => {
    const factory = internalSettingsAddon.decks?.settings;
    expect(factory).toBeDefined();
    const deck = factory!(0);
    expect(deck.name).toBe("Settings");
    const types = (deck.buttons ?? []).map(
      (b) => (b as { type: string }).type,
    );
    expect(types).toContain("core:settings-brightness");
    expect(types).toContain("core:settings-theme");
    expect(types).toContain("core:settings-about");
  });
});
