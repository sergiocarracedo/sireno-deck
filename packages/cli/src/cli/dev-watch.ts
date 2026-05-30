// Keep cli:dev on the external tsx watch seam while restoring the
// default `start --config config.yml` path and passthrough args like
// `emulate --port 8912`.
const DEFAULT_DEV_WATCH_ARGS = ["start", "--config", "config.yml"] as const

export const resolveDevWatchArgs = (args: readonly string[]) =>
  args.length > 0 ? [...args] : [...DEFAULT_DEV_WATCH_ARGS]

const run = async () => {
  process.argv = [
    process.argv[0] ?? "node",
    process.argv[1] ?? "packages/cli/src/cli/index.ts",
    ...resolveDevWatchArgs(process.argv.slice(2)),
  ]

  await import("./index.js")
}

run().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
