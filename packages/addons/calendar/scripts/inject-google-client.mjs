import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parseEnv } from "node:util"

const env = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {}
const secret =
  process.env.SIRENO_GOOGLE_CLIENT_SECRET ||
  env.SIRENO_GOOGLE_CLIENT_SECRET ||
  env.GCANEDAR_APP_SECRET
if (secret) {
  for (const path of ["dist/index.js", "dist/auth/google-auth.js"]) {
    if (!existsSync(path)) continue
    const content = readFileSync(path, "utf8")
    const updated = content.replaceAll(
      '"__SIRENO_GOOGLE_CLIENT_SECRET__"',
      JSON.stringify(secret),
    )
    if (updated !== content) writeFileSync(path, updated)
  }
}
