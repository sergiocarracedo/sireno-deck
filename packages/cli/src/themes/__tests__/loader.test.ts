import { describe, expect, it } from "vitest";

import { AddonRegistry } from "@/addon/registry";
import type { LoadedTheme } from "@/addon/api";

import { registerBuiltInThemes, resolveActiveTheme } from "../loader";

const makeTheme = (name: string): LoadedTheme => ({
  name,
  apiVersion: 1,
  source: { kind: "local", resolvedPath: `/tmp/themes/${name}` },
  manifestPath: `/tmp/themes/${name}/sirenodeck.json`,
  uiOverridesPath: null,
  cssPath: "",
});

describe("themes/loader", () => {
  it("registerBuiltInThemes registers the default theme", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    const theme = registry.getTheme("default");
    expect(theme).toBeDefined();
    expect(theme?.apiVersion).toBe(1);
    expect(theme?.source.kind).toBe("builtin");
  });

  it("resolveActiveTheme returns the default theme when name is undefined", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    const { theme } = resolveActiveTheme(registry, { theme: undefined });
    expect(theme.name).toBe("default");
  });

  it("resolveActiveTheme returns the requested theme when present", () => {
    const registry = new AddonRegistry();
    registry.loadTheme(makeTheme("custom"));
    const { theme } = resolveActiveTheme(registry, { theme: "custom" });
    expect(theme.name).toBe("custom");
  });

  it("resolveActiveTheme throws with available themes when name is missing", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(
      /Theme 'missing' is not registered/,
    );
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(/default/);
  });

  it("listThemes returns registered themes", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    registry.loadTheme(makeTheme("custom"));
    expect(
      registry
        .listThemes()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["custom", "default"]);
  });
});
