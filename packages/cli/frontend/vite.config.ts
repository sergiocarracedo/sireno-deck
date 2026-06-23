import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sirenoDeck2 } from "sireno-deck-2/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), sirenoDeck2({ token: process.env["SIRENO_TOKEN"] ?? "" })],
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
