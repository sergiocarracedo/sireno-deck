// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const generatedMediaDir = resolve(here, "../../../.showcase")
const mediaFiles = (directory) => {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? mediaFiles(filePath) : [filePath]
  })
}

const mediaMime = (filePath) =>
  ({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webm": "video/webm",
  })[extname(filePath).toLowerCase()] ?? "application/octet-stream"

const scriptedDemoMedia = () => ({
  name: "scripted-demo-media",
  configureServer(server) {
    server.middlewares.use("/media", (request, response, next) => {
      const relativePath = decodeURIComponent(request.url ?? "").split("?")[0]
      if (relativePath.includes("..")) return next()
      const filePath = resolve(generatedMediaDir, `.${relativePath}`)
      if (!existsSync(filePath) || !statSync(filePath).isFile()) return next()
      response.setHeader("Content-Type", mediaMime(filePath))
      createReadStream(filePath).pipe(response)
    })
  },
  generateBundle() {
    for (const filePath of mediaFiles(generatedMediaDir)) {
      this.emitFile({
        type: "asset",
        fileName: `media/${filePath.slice(generatedMediaDir.length + 1)}`,
        source: readFileSync(filePath),
      })
    }
  },
})

export default defineConfig({
  site: "https://sirenodeck.fyi",
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
          href: "https://github.com/sergiocarracedo/sireno-deck",
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
    plugins: [tailwindcss(), scriptedDemoMedia()],
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
