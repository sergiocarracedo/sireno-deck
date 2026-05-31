// Keep cli:dev on the external tsx watch seam while restoring the
// default `start --config config.yml` path and passthrough args like
// `emulate --port 8912`.
const DEFAULT_DEV_WATCH_ARGS = ['start', '--config', 'config.yml'] as const

const normalizeForwardedArgs = (args: readonly string[]) =>
  args[0] === '--' ? args.slice(1) : args

export const resolveDevWatchArgs = (args: readonly string[]) => {
  const normalizedArgs = normalizeForwardedArgs(args)
  return normalizedArgs.length > 0
    ? [...normalizedArgs]
    : [...DEFAULT_DEV_WATCH_ARGS]
}

const run = async () => {
  process.argv = [
    process.argv[0] ?? 'node',
    process.argv[1] ?? 'packages/cli/src/cli/index.ts',
    ...resolveDevWatchArgs(process.argv.slice(2)),
  ]

  await import('./index.js')
}

run().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
