import type { Plugin, ViteDevServer } from "vite";

export interface SirenoVitePluginOptions {
  token?: string;
  addons?: ReadonlyArray<{ name: string; frontend?: { main: string; styles?: string[] } }>;
}

const TOKEN_VIRTUAL_ID = "virtual:sireno/token";
const TOKEN_RESOLVED_ID = "\0virtual:sireno/token";

const ADDONS_VIRTUAL_ID = "virtual:sireno/addons";
const ADDONS_RESOLVED_ID = "\0virtual:sireno/addons";

export const TOKEN_MODULE = (token: string): string =>
  `export const token = ${JSON.stringify(token)};\n`;

export const buildAddonsImports = (
  addons: ReadonlyArray<{ name: string; frontend?: { main: string; styles?: string[] } }>,
): string => {
  const lines: string[] = [];
  for (const addon of addons) {
    if (addon.frontend === undefined) continue;
    lines.push(
      `import * as ${addon.name.replace(/[^a-zA-Z0-9_$]/g, "_")}_frontend from ${JSON.stringify(addon.frontend.main)};`,
    );
  }
  lines.push(
    `export const addons = ${JSON.stringify(
      addons
        .filter((a) => a.frontend !== undefined)
        .map((a) => ({ name: a.name, main: a.frontend!.main, styles: a.frontend!.styles ?? [] })),
    )};`,
  );
  return lines.join("\n");
};

export const sirenoDeck2 = (options: SirenoVitePluginOptions = {}): Plugin => {
  const token = options.token ?? "";
  const addons = options.addons ?? [];

  return {
    name: "sireno-deck-2",
    resolveId: (id) => {
      if (id === TOKEN_VIRTUAL_ID) return TOKEN_RESOLVED_ID;
      if (id === ADDONS_VIRTUAL_ID) return ADDONS_RESOLVED_ID;
      return null;
    },
    load: (id) => {
      if (id === TOKEN_RESOLVED_ID) return TOKEN_MODULE(token);
      if (id === ADDONS_RESOLVED_ID) return buildAddonsImports(addons);
      return null;
    },
    configureServer: (server: ViteDevServer) => {
      server.httpServer?.once("listening", () => {
        const addr = server.httpServer?.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : 0;
        process.stdout.write(`READY ${port}\n`);
      });
    },
  };
};
