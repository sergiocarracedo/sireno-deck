import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

export interface SirenoVitePluginTheme {
  name: string;
  cssPath: string;
  frontendPath: string;
}

export interface SirenoVitePluginAddon {
  name: string;
  frontend?: { main: string; styles?: string[] };
  buttons?: ReadonlyArray<{ type: string }>;
}

export interface SirenoVitePluginOptions {
  token?: string;
  addons?: ReadonlyArray<SirenoVitePluginAddon>;
  theme?: SirenoVitePluginTheme;
}

const TOKEN_VIRTUAL_ID = "virtual:sireno/token";
const TOKEN_RESOLVED_ID = "\0virtual:sireno/token";

const ADDONS_VIRTUAL_ID = "virtual:sireno/addons";
const ADDONS_RESOLVED_ID = "\0virtual:sireno/addons";

const ADDONS_REGISTRY_VIRTUAL_ID = "virtual:sireno/addons/registry";
const ADDONS_REGISTRY_RESOLVED_ID = "\0virtual:sireno/addons/registry";

const THEME_VIRTUAL_ID = "virtual:sireno/theme.css";
const THEME_RESOLVED_ID = "\0virtual:sireno/theme.css";

const THEMES_MANIFEST_VIRTUAL_ID = "virtual:sireno/themes/manifest";
const THEMES_MANIFEST_RESOLVED_ID = "\0virtual:sireno/themes/manifest";

export const TOKEN_MODULE = (token: string): string =>
  `export const token = ${JSON.stringify(token)};\n`;

const sanitizeIdentifier = (name: string): string => {
  const sanitized = name.replace(/[^a-zA-Z0-9_$]/g, "_");
  return /^[a-zA-Z_$]/.test(sanitized) ? sanitized : `_${sanitized}`;
};

export const buildAddonsImports = (
  addons: ReadonlyArray<SirenoVitePluginAddon>,
): string => {
  const lines: string[] = [];
  for (const addon of addons) {
    if (addon.frontend === undefined) continue;
    lines.push(
      `import * as ${sanitizeIdentifier(addon.name)}_frontend from ${JSON.stringify(addon.frontend.main)};`,
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

export const buildAddonsRegistryModule = (
  addons: ReadonlyArray<SirenoVitePluginAddon>,
): string => {
  const entries: Array<{ type: string; addonName: string; varName: string }> = [];
  for (const addon of addons) {
    if (addon.frontend === undefined) continue;
    if (addon.buttons === undefined) continue;
    const varName = `${sanitizeIdentifier(addon.name)}_frontend`;
    for (const button of addon.buttons) {
      entries.push({ type: button.type, addonName: addon.name, varName });
    }
  }
  const imports = addons
    .filter((a) => a.frontend !== undefined && a.buttons !== undefined)
    .map((a) => `import * as ${sanitizeIdentifier(a.name)}_frontend from ${JSON.stringify(a.frontend!.main)};`)
    .join("\n");
  const map: Record<string, string> = {};
  for (const entry of entries) {
    map[`${entry.type}|${entry.addonName}`] = entry.varName;
  }
  const lines: string[] = [];
  if (imports.length > 0) lines.push(imports);
  lines.push("/* eslint-disable */");
  lines.push("const _components = {");
  for (const addon of addons) {
    if (addon.frontend === undefined) continue;
    const varName = sanitizeIdentifier(addon.name) + "_frontend";
    lines.push(`  ${varName}: { addonName: ${JSON.stringify(addon.name)}, Component: ${varName}.default ?? ${varName} },`);
  }
  lines.push("};");
  lines.push("export const addonRegistry = {");
  for (const entry of entries) {
    lines.push(
      `  ${JSON.stringify(entry.type)}: { addonName: ${JSON.stringify(entry.addonName)}, Component: ${entry.varName}.default ?? ${entry.varName} },`,
    );
  }
  lines.push("};");
  void map;
  return lines.join("\n");
};

export const readThemeCss = (theme: SirenoVitePluginTheme | undefined): string => {
  if (!theme) return "";
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
  const themeCss = readThemeCss(theme);

return {
    name: "sireno-deck-2",
    resolveId: (id) => {
      if (id === TOKEN_VIRTUAL_ID) return TOKEN_RESOLVED_ID;
      if (id === ADDONS_VIRTUAL_ID) return ADDONS_RESOLVED_ID;
      if (id === ADDONS_REGISTRY_VIRTUAL_ID) return ADDONS_REGISTRY_RESOLVED_ID;
      if (id === THEME_VIRTUAL_ID) return THEME_RESOLVED_ID;
      if (id === THEMES_MANIFEST_VIRTUAL_ID) return THEMES_MANIFEST_RESOLVED_ID;
      return null;
    },
    load: (id) => {
      if (id === TOKEN_RESOLVED_ID) return TOKEN_MODULE(token);
      if (id === ADDONS_RESOLVED_ID) return buildAddonsImports(addons);
      if (id === ADDONS_REGISTRY_RESOLVED_ID) return buildAddonsRegistryModule(addons);
      if (id === THEME_RESOLVED_ID) return themeCss;
      if (id === THEMES_MANIFEST_RESOLVED_ID) return buildThemesManifestModule(theme);
      return null;
    },
    configResolved: (config) => {
      if (themeCss.length === 0) return;
      const root = config.root ?? process.cwd();
      const dir = join(root, ".sireno-deck-2");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filePath = join(dir, "theme.css");
      const themeDir = theme ? dirname(theme.frontendPath) : null;
      const uiDir = themeDir ? join(themeDir, "..", "..", "ui") : null;
      const sourceDirs = [themeDir, uiDir].filter(Boolean) as string[];
      const sourceDirective = sourceDirs.map(d => `@source "${d}/**/*.{ts,tsx}";`).join("\n") + "\n";
      writeFileSync(filePath, sourceDirective + themeCss, "utf8");
    },
    config: (config) => {
      if (themeCss.length === 0) return config;
      const root = config.root ?? process.cwd();
      const alias = (config.resolve?.alias ?? []) as Array<{ find: string | RegExp; replacement: string }>;
      const themeAlias = {
        find: /^sireno-deck-2-theme$/,
        replacement: join(root, ".sireno-deck-2", "theme.css"),
      };
      return {
        ...config,
        resolve: {
          ...config.resolve,
          alias: [...alias, themeAlias],
        },
      };
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