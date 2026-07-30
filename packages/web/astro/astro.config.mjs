// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"
import { resolve } from "node:path"

export default defineConfig({
  site: "https://sireno-deck.dev",
  integrations: [
    starlight({
      title: "Sireno Deck",
      description:
        "Declarative Elgato Stream Deck control. Linux-first, dotfile-friendly, themable.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sireno-deck/sireno-deck",
        },
      ],
      customCss: [resolve("./src/styles/global.css")],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
