// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { resolve } from "node:path"

export default defineConfig({
  site: "https://sireno-deck.dev",
  integrations: [
    react(),
    starlight({
      title: "Sireno Deck Docs",
      description:
        "Declarative Elgato Stream Deck control. Linux-first, dotfile-friendly, themable.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sireno-deck/sireno-deck",
        },
      ],
      customCss: [
        resolve("./src/styles/global.css"),
        resolve("./src/styles/starlight-overrides.css"),
      ],
      sidebar: [
        {
          label: "User Guide",
          items: [{ autogenerate: { directory: "user" } }],
        },
        {
          label: "Developer Guide",
          items: [{ autogenerate: { directory: "developer" } }],
        },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "reference" } }],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        allow: [
          resolve("./"),
          resolve("../../"),
          resolve("../../../"),
          resolve("../../../node_modules"),
        ],
      },
    },
  },
})
