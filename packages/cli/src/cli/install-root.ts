import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Resolve the install root of the distributed bundle:
 *   <root>/sirenodeck, <root>/lib/cli/main.mjs, <root>/frontend/dist, <root>/etc/install.json
 *
 * Priority: SIRENO_INSTALL_ROOT (set by the launcher/installer) → walk up from
 * this module looking for the install markers (`etc/install.json`,
 * `frontend/dist/index.html`). Returns null in the dev checkout so callers
 * fall back to the monorepo layout.
 */
export const resolveInstallRoot = (): string | null => {
  const env = process.env["SIRENO_INSTALL_ROOT"]
  if (env !== undefined && env.length > 0) return env
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "etc", "install.json"))) return dir
    if (existsSync(join(dir, "frontend", "dist", "index.html"))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}
