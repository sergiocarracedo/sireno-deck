import { buildTailwindBrowserStylesheet } from './build-tailwind-browser'
import { cli } from './index'

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

export const resolveDevWatchConfigPath = (args: readonly string[]) => {
  const normalizedArgs = normalizeForwardedArgs(args)
  const configFlagIndex = normalizedArgs.findIndex(
    (argument) => argument === '--config' || argument.startsWith('--config='),
  )

  if (configFlagIndex < 0) {
    return 'config.yml'
  }

  const configFlag = normalizedArgs[configFlagIndex]
  if (configFlag?.startsWith('--config=')) {
    return configFlag.slice('--config='.length)
  }

  return normalizedArgs[configFlagIndex + 1] ?? 'config.yml'
}

export const prepareDevWatchRuntime = async (
  args: readonly string[],
  buildTailwind = buildTailwindBrowserStylesheet,
) => {
  const resolvedArgs = resolveDevWatchArgs(args)
  await buildTailwind({ configPath: resolveDevWatchConfigPath(args) })
  return resolvedArgs
}

const run = async () => {
  const resolvedArgs = await prepareDevWatchRuntime(process.argv.slice(2))

  process.argv = [
    process.argv[0] ?? 'node',
    process.argv[1] ?? 'packages/cli/src/cli/index.ts',
    ...resolvedArgs,
  ]

  await cli()
}

run().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
