import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/** Fingerprint the source inputs shared by the CLI and its web surfaces. */
export const fingerprintBuildInputs = (root: string): string => {
  const hash = createHash("sha256")
  const visit = (relative: string): void => {
    const entries = readdirSync(join(root, relative), {
      withFileTypes: true,
    }).sort((a, b) => a.name.localeCompare(b.name, "en"))
    for (const entry of entries) {
      if (
        entry.name.startsWith(".") ||
        ["node_modules", "dist", "__tests__", "coverage"].includes(entry.name)
      )
        continue
      const path = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && !/\.(test|spec)\.[^.]+$/.test(entry.name)) {
        const contents = readFileSync(join(root, path))
        hash.update(`${path.length}:${path}:${contents.length}:`)
        hash.update(contents)
      }
    }
  }
  for (const directory of ["src", "frontend", "config-ui"]) visit(directory)
  const manifest = readFileSync(join(root, "package.json"))
  hash.update(`package.json:${manifest.length}:`)
  hash.update(manifest)
  return hash.digest("hex")
}
