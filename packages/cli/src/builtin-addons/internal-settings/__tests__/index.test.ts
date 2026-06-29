import { describe, expect, it } from "vitest";

import { isSirenoAddon } from "@/addon/api-types";

import { internalSettingsAddon } from "../index";

describe("internal-settings addon", () => {
  it("addon object validates via isSirenoAddon", () => {
    expect(isSirenoAddon(internalSettingsAddon)).toBe(true);
  });

  it("all three buttons have internal: true", () => {
    const buttons = internalSettingsAddon.buttons ?? [];
    expect(buttons.length).toBe(3);
    for (const b of buttons) {
      expect((b as { internal?: boolean }).internal).toBe(true);
    }
  });

  it("createDecks returns a settings deck with the three buttons", () => {
    const def = internalSettingsAddon.decks?.[0];
    expect(def).toBeDefined();
    const result = def!.createDecks({ config: {} as never });
    expect(result.settings).toBeDefined();
    const buttons = (result.settings!.buttons ?? []) as Array<{ type: string }>;
    const types = buttons.map((b) => b.type);
    expect(types).toContain("core:settings-brightness");
    expect(types).toContain("core:settings-theme");
    expect(types).toContain("core:settings-about");
  });
});
