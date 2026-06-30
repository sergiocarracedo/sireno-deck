import { describe, expect, it } from "vitest";

import { coreButtonsAddon } from "../index";
import { actionButtonBackend as ActionButtonBackend } from "../buttons/action";
import { changeDeckButtonBackend as ChangeDeckButtonBackend } from "../buttons/change-deck";
import { toggleButtonBackend as ToggleButtonBackend } from "../buttons/toggle";

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
});
