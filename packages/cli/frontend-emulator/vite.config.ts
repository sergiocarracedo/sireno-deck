import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { sirenoDeck2 } from "../src/vite/index.ts";

const wsUrl = process.env["SIRENO_WS_URL"] ?? "ws://127.0.0.1:52937";

const parseThemeFromEnv = ():
  | { name: string; cssPath: string; frontendPath: string }
  | undefined => {
  const blob = process.env["SIRENO_THEME"];
  if (blob === undefined || blob.length === 0) return undefined;
  try {
    const parsed = JSON.parse(blob) as {
      name?: unknown;
      cssPath?: unknown;
      frontendPath?: unknown;
    };
    if (
      typeof parsed.name === "string" &&
      typeof parsed.cssPath === "string" &&
      typeof parsed.frontendPath === "string"
    ) {
      return {
        name: parsed.name,
        cssPath: parsed.cssPath,
        frontendPath: parsed.frontendPath,
      };
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

const defaultTheme = {
  name: "default",
  cssPath: resolve(__dirname, "../src/themes/default/theme.css"),
  frontendPath: resolve(__dirname, "../src/themes/default/index.tsx"),
};

const theme = parseThemeFromEnv() ?? defaultTheme;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sirenoDeck2({
      token: process.env["SIRENO_TOKEN"] ?? "",
      theme,
    }),
  ],
  resolve: {
    alias: [
      { find: /^@sireno-deck-2\/cli$/, replacement: resolve(__dirname, "../src/index.ts") },
      { find: /^@\//, replacement: resolve(__dirname, "../src") + "/" },
    ],
  },
  define: {
    "import.meta.env.VITE_WS_URL": JSON.stringify(wsUrl),
  },
  server: {
    port: Number(process.env.SIRENO_EMULATOR_PORT ?? 52938),
    strictPort: false,
    host: "127.0.0.1",
  },
});