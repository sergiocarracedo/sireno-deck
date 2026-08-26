import { copyFileSync, cpSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

mkdirSync(join(root, "dist"), { recursive: true })
copyFileSync(
  join(root, "sirenodeck.json"),
  join(root, "dist", "sirenodeck.json"),
)
// ponytail: uniform contract — assets referenced via addon:// live in
// <pkg>/dist/assets; mirror the whole src/assets tree so new icons are
// picked up without editing this script.
cpSync(join(root, "src", "assets"), join(root, "dist", "assets"), {
  recursive: true,
})
