import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

const wsUrl = process.env["SIRENO_WS_URL"] ?? "ws://127.0.0.1:52937";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@sireno-deck-2\/cli$/, replacement: resolve(__dirname, "../src/index.ts") },
      { find: /^@\//, replacement: resolve(__dirname, "src") + "/" },
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