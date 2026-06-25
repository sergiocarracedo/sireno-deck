import { readFileSync } from "node:fs";
import type { Plugin, ViteDevServer } from "vite";

export interface SirenoVitePluginTheme {
  name: string;
  cssPath: string;
  frontendPath: string;
}

export interface SirenoVitePluginOptions {
  token?: string;
  addons?: ReadonlyArray<{ name: string; frontend?: { main: string; styles?: string[] } }>;
  theme?: SirenoVitePluginTheme;
}

const TOKEN_VIRTUAL_ID = "virtual:sireno/token";
const TOKEN_RESOLVED_ID = "\0virtual:sireno/token";

const ADDONS_VIRTUAL_ID = "virtual:sireno/addons";
const ADDONS_RESOLVED_ID = "\0virtual:sireno/addons";

const THEME_VIRTUAL_ID = "virtual:sireno/theme";
const THEME_RESOLVED_ID = "\0virtual:sireno/theme";

const THEMES_MANIFEST_VIRTUAL_ID = "virtual:sireno/themes/manifest";
const THEMES_MANIFEST_RESOLVED_ID = "\0virtual:sireno/themes/manifest";

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

export const buildThemeCssModule = (theme: SirenoVitePluginTheme | undefined): string => {
  if (!theme) return "/* no theme */\n";
  try {
    const css = readFileSync(theme.cssPath, "utf8");
    return css;
  } catch {
    return `/* theme css not found at ${theme.cssPath} */\n`;
  }
};

export const buildThemesManifestModule = (theme: SirenoVitePluginTheme | undefined): string => {
  if (!theme) {
    return `export const activeTheme = null;\nexport const components = {};\nexport const surfaces = {};\nexport const primitives = {};\n`;
  }
  const rawId = theme.name.replace(/[^a-zA-Z0-9_$]/g, "_");
  const importId = /^[a-zA-Z_$]/.test(rawId) ? `_${rawId}` : rawId;
  return [
    `import * as ${importId} from ${JSON.stringify(theme.frontendPath)};`,
    `export const activeTheme = { name: ${JSON.stringify(theme.name)}, frontendPath: ${JSON.stringify(theme.frontendPath)} };`,
    `export const components = ${importId}.components ?? {};`,
    `export const surfaces = ${importId}.surfaces ?? {};`,
    `export const primitives = ${importId}.primitives ?? {};`,
    `const _themeDefault = ${importId}.default ?? ${importId};`,
    `export { _themeDefault as default };`,
  ].join("\n");
};

export const sirenoDeck2 = (options: SirenoVitePluginOptions = {}): Plugin => {
  const token = options.token ?? "";
  const addons = options.addons ?? [];
  const theme = options.theme;

  return {
    name: "sireno-deck-2",
    resolveId: (id) => {
      if (id === TOKEN_VIRTUAL_ID) return TOKEN_RESOLVED_ID;
      if (id === ADDONS_VIRTUAL_ID) return ADDONS_RESOLVED_ID;
      if (id === THEME_VIRTUAL_ID) return THEME_RESOLVED_ID;
      if (id === THEMES_MANIFEST_VIRTUAL_ID) return THEMES_MANIFEST_RESOLVED_ID;
      return null;
    },
    load: (id) => {
      if (id === TOKEN_RESOLVED_ID) return TOKEN_MODULE(token);
      if (id === ADDONS_RESOLVED_ID) return buildAddonsImports(addons);
      if (id === THEME_RESOLVED_ID) return buildThemeCssModule(theme);
      if (id === THEMES_MANIFEST_RESOLVED_ID) return buildThemesManifestModule(theme);
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
