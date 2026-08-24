import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

mkdirSync(join(root, "dist"), { recursive: true })
mkdirSync(join(root, "dist", "assets"), { recursive: true })
copyFileSync(
  join(root, "sirenodeck.json"),
  join(root, "dist", "sirenodeck.json"),
)
for (const file of ["opencode-dark-square.svg", "claude-code.svg"]) {
  copyFileSync(
    join(root, "src", "assets", file),
    join(root, "dist", "assets", file),
  )
}
