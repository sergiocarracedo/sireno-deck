import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  resolveDevWatchArgs,
  resolveDevWatchConfigPath,
  prepareDevWatchRuntime,
} from './dev-watch.js'
import {
  resolveTailwindBrowserContract,
  serializeTailwindBrowserContract,
} from './build-tailwind-browser.js'

const tempDirs: string[] = []
const phase23FixtureRoot = resolve(
  import.meta.dirname,
  '../../fixtures/phase-23/local-raw-addon',
)
const phase25FixtureRoot = resolve(
  import.meta.dirname,
  '../../fixtures/phase-25/custom-tsx-theme',
)

afterEach(() => {
  for (const directory of tempDirs.splice(0, tempDirs.length)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('resolveDevWatchArgs', () => {
  it('defaults bare cli:dev runs to the real start command', () => {
    expect(resolveDevWatchArgs([])).toEqual(['start', '--config', 'config.yml'])
  })

  it('passes forwarded emulate args through untouched', () => {
    expect(resolveDevWatchArgs(['emulate', '--port', '8912'])).toEqual([
      'emulate',
      '--port',
      '8912',
    ])
  })

  it("drops pnpm's forwarded -- sentinel before command parsing", () => {
    expect(resolveDevWatchArgs(['--', 'emulate', '--port', '8912'])).toEqual([
      'emulate',
      '--port',
      '8912',
    ])
  })
})

describe('resolveDevWatchConfigPath', () => {
  it('defaults to config.yml when no explicit config flag is forwarded', () => {
    expect(resolveDevWatchConfigPath([])).toBe('config.yml')
  })

  it('reads both --config value and --config=value forms', () => {
    expect(resolveDevWatchConfigPath(['start', '--config', 'custom.yml'])).toBe(
      'custom.yml',
    )
    expect(resolveDevWatchConfigPath(['--config=custom.yml'])).toBe('custom.yml')
  })
})

describe('prepareDevWatchRuntime', () => {
  it('rebuilds the Tailwind browser stylesheet before restarting the CLI', async () => {
    const buildTailwind = vi.fn(async () => undefined)

    await expect(
      prepareDevWatchRuntime(['emulate', '--config', 'custom.yml'], buildTailwind),
    ).resolves.toEqual(['emulate', '--config', 'custom.yml'])
    expect(buildTailwind).toHaveBeenCalledWith({ configPath: 'custom.yml' })
  })
})

describe('dev-watch source entry seam', () => {
  it('imports the real source cli entrypoint instead of a missing built js sibling', () => {
    const source = readFileSync(resolve(import.meta.dirname, './dev-watch.ts'), 'utf8')

    expect(source).toContain("await import('./index.ts')")
    expect(source).not.toContain("await import('./index.js')")
  })
})

describe('resolveTailwindBrowserContract', () => {
  it('collects committed local addon and custom theme sources plus safelist entries', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'sireno-tailwind-contract-'))
    tempDirs.push(tempDir)
    const configPath = join(tempDir, 'config.yml')

    writeFileSync(
      configPath,
      [
        `theme: ${JSON.stringify(phase25FixtureRoot)}`,
        'main_deck: main',
        'decks:',
        '  main:',
        '    id: main',
        '    buttons: []',
        'addons:',
        '  - name: phase-23-local-raw-addon',
        '    enabled: true',
        '    source: local',
        `    path: ${JSON.stringify(phase23FixtureRoot)}`,
      ].join('\n'),
    )

    const contract = await resolveTailwindBrowserContract(configPath)
    const serialized = serializeTailwindBrowserContract(contract)

    expect(contract.sources).toEqual(
      expect.arrayContaining([phase23FixtureRoot, phase25FixtureRoot]),
    )
    expect(contract.safelist).toEqual([
      'outline-2',
      'rotate-6',
      'rounded-[17px]',
      'tracking-[0.33em]',
    ])
    expect(serialized).toContain('@source "./fixtures/phase-23/local-raw-addon";')
    expect(serialized).toContain('@source "./fixtures/phase-25/custom-tsx-theme";')
    expect(serialized).toContain('@source inline("rotate-6");')
    expect(serialized).toContain('@source inline("rounded-[17px]");')
  })
})
