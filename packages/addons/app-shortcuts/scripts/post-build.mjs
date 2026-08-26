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
// ponytail: deck definitions reference addon://app-shortcuts/assets/*.svg
// and addon:// resolution joins <addonDir>/assets/<name>. The CLI resolves
// against <pkg>/dist when it exists (see buildExternalAddonDirs), so keep
// the tarball self-contained by mirroring the assets tree into dist.
cpSync(join(root, "assets"), join(root, "dist", "assets"), {
  recursive: true,
})
