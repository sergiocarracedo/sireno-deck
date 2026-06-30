import { describe, expect, it } from "vitest";

import ActionButtonBackend from "../buttons/action/backend";
import ChangeDeckButtonBackend from "../buttons/change-deck/backend";
import ToggleButtonBackend from "../buttons/toggle/backend";
import { coreButtonsAddon } from "../index";

describe("core-buttons addon", () => {
  it("manifest declares apiVersion 3 and the expected name", () => {
    expect(coreButtonsAddon.apiVersion).toBe(3);
    expect(coreButtonsAddon.name).toBe("core-buttons");
  });

  it("action button configSchema rejects empty command", () => {
    const result = ActionButtonBackend.configSchema.safeParse({ command: "" });
    expect(result.success).toBe(false);
  });

  it("change-deck configSchema rejects empty deck", () => {
    const result = ChangeDeckButtonBackend.configSchema.safeParse({ deck: "" });
    expect(result.success).toBe(false);
  });

  it("toggle configSchema uses default false", () => {
    const result = ToggleButtonBackend.configSchema.safeParse({ key: "k" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.default).toBe(false);
  });

  it("sirenodeck.json lists all 4 button types", async () => {
    const manifestJson = (await import("../sirenodeck.json", {
      with: { type: "json" },
    })).default as { buttons: Array<{ type: string }> };
    const types = manifestJson.buttons.map((b) => b.type).sort();
    expect(types).toEqual([
      "core-buttons:action",
      "core-buttons:change-deck",
      "core-buttons:media-sample",
      "core-buttons:toggle",
    ]);
  });
});