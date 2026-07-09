#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = resolve(__dirname, "..")
const cliEntry = resolve(cliRoot, "src/cli/main.ts")

const tsxBin = resolve(cliRoot, "node_modules", ".bin", "tsx")

/**
 * Tell tsx --watch to ignore the frontend workspace and theme assets. Those
 * are served by Vite's own dev server; tsx restarting the daemon on a
 * `frontend.tsx` change would kill Vite, the WebSocket bridge, and the
 * emulator — exactly the "silent crash" we saw before adding ErrorBoundary.
 *
 * Use `tsx watch --exclude <patterns>` (a chokidar glob per token).
 * The frontend lives at packages/cli/frontend and its addons live at
 * packages/cli/src/builtin-addons/*\/frontend*; both should be hot-loaded
 * by Vite alone, not trigger a daemon restart.
 */
const excludePatterns = [
  "packages/cli/frontend/**",
  "packages/cli/src/builtin-addons/**/frontend.tsx",
  "packages/cli/src/builtin-addons/**/frontend/**",
  "packages/cli/emulator/**",
  // Also match by the bare path tsx reports from the workspace root, where
  // tsx is invoked relative to `src/cli/main.ts`:
  "src/builtin-addons/**/frontend.tsx",
  "src/builtin-addons/**/frontend/**",
  "**/frontend.tsx",
  "**/frontend/**",
  "**/vite.config.ts",
  "**/vite.config.cts",
  "**/vite.config.mts",
]

const args = [
  "watch",
  ...excludePatterns.flatMap((p) => ["--exclude", p]),
  cliEntry,
  ...process.argv.slice(2),
]

const child = spawn(tsxBin, args, {
  stdio: "inherit",
  cwd: cliRoot,
  env: {
    ...process.env,
    SIRENO_CWD: process.cwd(),
    TSX_TSCONFIG_PATH: resolve(cliRoot, "tsconfig.json"),
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
