import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

mkdirSync(join(root, "dist"), { recursive: true })
copyFileSync(
  join(root, "sirenodeck.json"),
  join(root, "dist", "sirenodeck.json"),
)
