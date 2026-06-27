import { describe, expect, it } from "vitest";

import { buildAddonByType, type ScannedAddon } from "./addon-registry.ts";

const scanned: ReadonlyArray<ScannedAddon> = [
  { name: "date-time", types: ["core:time", "core:date"], frontendEntry: "/abs/date-time/frontend.tsx" },
  { name: "weather", types: ["core:weather"], frontendEntry: "/abs/weather/frontend.tsx" },
  { name: "no-frontend", types: ["core:custom"], frontendEntry: null },
];

describe("buildAddonByType", () => {
  it("returns an empty map for no addons", () => {
    expect(buildAddonByType([]).size).toBe(0);
  });

  it("maps each type to its addon name and frontend entry", () => {
    const map = buildAddonByType(scanned);
    expect(map.get("core:time")).toEqual({
      name: "date-time",
      frontendEntry: "/abs/date-time/frontend.tsx",
    });
    expect(map.get("core:date")).toMatchObject({ name: "date-time" });
    expect(map.get("core:weather")).toMatchObject({ name: "weather" });
  });

  it("keeps the first addon when a type appears in multiple addons", () => {
    const map = buildAddonByType([
      { name: "first", types: ["core:foo"], frontendEntry: "/first/frontend.tsx" },
      { name: "second", types: ["core:foo"], frontendEntry: "/second/frontend.tsx" },
    ]);
    expect(map.get("core:foo")?.name).toBe("first");
  });

  it("includes types with null frontend entry (addon exists but no surface)", () => {
    const map = buildAddonByType(scanned);
    expect(map.get("core:custom")).toMatchObject({
      name: "no-frontend",
      frontendEntry: null,
    });
  });
});
