#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// eslint-disable-next-line import/extensions
import { createInterface } from "node:readline"
import { reapOrphanProcessGroup, setWrapperTitle } from "./_wrapper-shared.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = resolve(__dirname, "..")
const cliEntry = resolve(cliRoot, "src/cli/main.ts")

const tsxBin = resolve(cliRoot, "node_modules", ".bin", "tsx")
const tsconfigPath = resolve(cliRoot, "tsconfig.json")

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

// ponytail: tsx watch is designed to stay alive across script restarts —
// wrapping it around a short-lived command (help, stop, status, restart,
// reload) hangs the wrapper forever waiting for tsx to exit, even though
// the script exits cleanly. Reserve `tsx watch` for `start` (supervises
// the daemon; restarts on TS changes) and `logs` (foreground tail).
// Everything else runs under plain `tsx`, which exits with the script.
const LONG_LIVED_COMMANDS = new Set(["start", "logs"])
const firstArg = process.argv[2]
const restArgs = process.argv.slice(2)

const spawnTsx = (args, envExtra = {}) =>
  spawn(tsxBin, args, {
    stdio: "inherit",
    cwd: cliRoot,
    env: {
      ...process.env,
      SIRENO_CWD: process.cwd(),
      TSX_TSCONFIG_PATH: tsconfigPath,
      ...envExtra,
    },
  })

const exitChild = (child) =>
  new Promise((resolve) => child.on("exit", resolve))

setWrapperTitle("sirenodeck:wrp")

// ponytail: tsx watch installs process.stdin.on("data") that restarts the
// child on any keypress. Interactive prompts (readline, @clack/prompts,
// capturePassword) send data on stdin → tsx sees it → restarts → loop.
// Run the first-run wizard with plain tsx (no watch) before starting
// tsx watch. Set SIRENO_SKIP_WIZARD so start.ts doesn't double-prompt.
if (firstArg === "start") {
  let skipWizard = false

  const probe = spawn(tsxBin, [cliEntry, "system-requirements", "--non-interactive"], {
    stdio: [process.stdin, "pipe", process.stderr],
    cwd: cliRoot,
    env: {
      ...process.env,
      SIRENO_CWD: process.cwd(),
      TSX_TSCONFIG_PATH: tsconfigPath,
    },
  })
  let probeOutput = ""
  probe.stdout.on("data", (chunk) => { probeOutput += chunk.toString() })
  const probeCode = await exitChild(probe)

  if (probeCode !== 0) {
    process.stdout.write(probeOutput)
    skipWizard = true

    const shouldRunWizard = await new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question(
        "Run the setup wizard now? [Y/n] ",
        (answer) => {
          rl.close()
          resolve(answer.trim().toLowerCase() !== "n")
        },
      )
    })

    if (shouldRunWizard) {
      const wizard = spawnTsx([cliEntry, "system-requirements"])
      await exitChild(wizard)
    }
  }

  const child = spawnTsx(
    [
      "watch",
      ...excludePatterns.flatMap((p) => ["--exclude", p]),
      cliEntry,
      ...restArgs,
    ],
    { SIRENO_WRAPPER_CHILD: "1", ...(skipWizard ? { SIRENO_SKIP_WIZARD: "1" } : {}) },
  )

  child.on("exit", (code) => {
    if (child.pid !== undefined) {
      reapOrphanProcessGroup(child.pid)
    }
    process.exit(code ?? 0)
  })
} else {
  const useWatch = firstArg !== undefined && LONG_LIVED_COMMANDS.has(firstArg)

  const args = useWatch
    ? [
        "watch",
        ...excludePatterns.flatMap((p) => ["--exclude", p]),
        cliEntry,
        ...restArgs,
      ]
    : [cliEntry, ...restArgs]

  const child = spawnTsx(args, { SIRENO_WRAPPER_CHILD: "1" })

  child.on("exit", (code) => {
    if (child.pid !== undefined) {
      reapOrphanProcessGroup(child.pid)
    }
    process.exit(code ?? 0)
  })
}
