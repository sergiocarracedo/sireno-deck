import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { sirenoDeck2 } from "../src/vite/index"

const __dirname = dirname(fileURLToPath(import.meta.url))

const wsUrl = process.env["SIRENO_WS_URL"] ?? "ws://127.0.0.1:52937"

const addonsFromEnv = () => {
  const blob = process.env["SIRENO_ADDONS"]
  if (blob === undefined || blob.length === 0) return undefined
  try {
    return JSON.parse(blob) as Array<{
      name: string
      frontend?: { main: string; styles?: string[] }
      buttons?: Array<{ type: string }>
      buttonTypes?: Record<string, string>
    }>
  } catch {
    return undefined
  }
}

const themeFromEnv = ():
  | { name: string; manifestPath: string; uiOverridesPath: string | null }
  | undefined => {
  const blob = process.env["SIRENO_THEME"]
  if (blob === undefined || blob.length === 0) return undefined
  try {
    const parsed = JSON.parse(blob) as {
      name?: unknown
      manifestPath?: unknown
      uiOverridesPath?: unknown
    }
    if (
      typeof parsed.name === "string" &&
      typeof parsed.manifestPath === "string"
    ) {
      return {
        name: parsed.name,
        manifestPath: parsed.manifestPath,
        uiOverridesPath:
          parsed.uiOverridesPath === null ||
          typeof parsed.uiOverridesPath === "string"
            ? (parsed.uiOverridesPath as string | null)
            : null,
      }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sirenoDeck2({
      token: process.env["SIRENO_TOKEN"] ?? "",
      ...(themeFromEnv() ? { theme: themeFromEnv()! } : {}),
      ...(addonsFromEnv() !== undefined ? { addons: addonsFromEnv()! } : {}),
    }),
    {
      name: "sireno-asset-proxy",
      configureServer(server) {
        const configDir =
          process.env["SIRENO_CONFIG_DIR"] ?? resolve(__dirname, "../../..")
        server.middlewares.use("/@sireno-asset", (req, res, next) => {
          const url = req.url ?? ""
          const safe = url.split("?")[0]!.replace(/^\/+/, "")
          if (safe.includes("..")) {
            next()
            return
          }
          const filePath = resolve(configDir, safe)
          try {
            const body = readFileSync(filePath)
            const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
            const mime =
              ext === "svg"
                ? "image/svg+xml"
                : ext === "png"
                  ? "image/png"
                  : ext === "jpg" || ext === "jpeg"
                    ? "image/jpeg"
                    : ext === "webp"
                      ? "image/webp"
                      : "application/octet-stream"
            res.setHeader("Content-Type", mime)
            res.setHeader("Cache-Control", "no-cache")
            res.end(body)
          } catch {
            next()
          }
        })
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5180, strictPort: true },
  resolve: {
    alias: [
      { find: /^@\//, replacement: resolve(__dirname, "../src") + "/" },
      {
        find: /^@sireno-deck\/cli$/,
        replacement: resolve(__dirname, "../src/index"),
      },
      {
        find: /^sireno-deck\/react$/,
        replacement: resolve(__dirname, "../src/api/react/index"),
      },
    ],
  },
  define: {
    "import.meta.env.VITE_WS_URL": JSON.stringify(wsUrl),
    "import.meta.env.SIRENO_CONFIG_DIR": JSON.stringify(
      process.env["SIRENO_CONFIG_DIR"] ?? resolve(__dirname, "../../.."),
    ),
  },
  assetsInclude: ["**/*.html"],
})
