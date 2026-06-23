import { describe, expect, it } from "vitest";

import { TOKEN_MODULE, buildAddonsImports } from "./virtual-modules.ts";

describe("vite plugin helpers", () => {
  it("TOKEN_MODULE emits a token export", () => {
    const src = TOKEN_MODULE("abc123");
    expect(src).toContain("export const token");
    expect(src).toContain('"abc123"');
  });

  it("buildAddonsImports skips addons without frontend", () => {
    const src = buildAddonsImports([
      { name: "no-frontend" },
      {
        name: "has-frontend",
        frontend: { main: "/path/to/frontend.js", styles: ["./styles.css"] },
      },
    ]);
    expect(src).toContain("has_frontend_frontend");
    expect(src).not.toContain("no_frontend_frontend");
    expect(src).toContain("export const addons");
  });

  it("buildAddonsImports includes style paths", () => {
    const src = buildAddonsImports([
      { name: "x", frontend: { main: "/x.js", styles: ["./a.css", "./b.css"] } },
    ]);
    expect(src).toContain("./a.css");
    expect(src).toContain("./b.css");
  });

  it("buildAddonsImports escapes addon names", () => {
    const src = buildAddonsImports([{ name: "@scope/with-dash", frontend: { main: "/x.js" } }]);
    expect(src).toContain("_scope_with_dash_frontend");
  });
});
