---
phase: 41
date: 2026-06-04
sources:
  - /works/opensource/sireno-deck/.planning/research/v1.4/STACK.md
  - /works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md
  - /works/opensource/sireno-deck/.planning/phases/41-first-run-chromium-auto-install/41-CONTEXT.md
---

# Phase 41 Research — First-Run Chromium Auto-Install

## Don't Hand-Roll

- **Don't bundle Chromium.** License complexity + 250MB binary bloat. Playwright is the official install path. [HIGH: PITFALLS.md]
- **Don't run `apt install`/`brew install` chromium.** Cross-distro mess. Playwright is the source of truth. [HIGH: PITFALLS.md]
- **Don't add `--with-deps`.** Requires sudo. User explicitly opted out. [HIGH: CONTEXT.md]

## Common Pitfalls

- **Network error → silent install failure.** Detect error categories (network vs permission) and surface clear message + exit 1. [HIGH: PITFALLS.md]
- **`--with-deps` accidentally added.** Always hardcode the args; no user input. [HIGH: CONTEXT.md]
- **Marker file out of sync with actual install.** Recompute the marker content from the playwright binary's existence + version, not from a "did we run install" flag. [MEDIUM]
- **Check runs in every command, slowing CLI.** Scope the check to `start` and `emulate` only. [HIGH: CONTEXT.md]
- **Skip flag conflicts with env var.** Both should work; flag takes precedence, env acts as global default. [MEDIUM]
- **System `node` doesn't have `npx` in PATH** for some installs. Use `node` direct invocation if `npx` missing. [LOW]

## Existing Patterns in This Codebase

- **`execa` already a dep** — use it for streaming the install output
- **pino logger** in use throughout CLI
- **yargs config in `cli/index.ts`** — `--skip-browser-install` flag fits the existing flag pattern
- **`process.env` checks** are standard for env-var-driven behavior

## Recommended Approach

### File structure

- `packages/cli/src/util/chromium-detect.ts` — detect + install logic
- `packages/cli/src/util/chromium-detect.test.ts` — unit tests with mocked filesystem + execa
- `packages/cli/src/cli/commands/start.ts` — add `await ensureChromium()` at top
- `packages/cli/src/cli/commands/emulate.ts` — add `await ensureChromium()` at top
- `packages/cli/src/cli/index.ts` — add `--skip-browser-install` flag to start/emulate

### Detection function

```ts
// packages/cli/src/util/chromium-detect.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execa } from 'execa'

const CACHE_DIR = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), '.cache', 'ms-playwright')
const MARKER_PATH = join(homedir(), '.cache', 'sireno-deck', 'chromium-installed')

export function isChromiumInstalled(): boolean {
  if (!existsSync(CACHE_DIR)) return false
  if (!existsSync(MARKER_PATH)) return false
  return true
}

export function isSkipped(): boolean {
  return process.env.SIRENO_SKIP_BROWSER_INSTALL === '1'
}

export async function ensureChromium(): Promise<void> {
  if (isSkipped()) return
  if (isChromiumInstalled()) return

  console.error('Installing Playwright Chromium (~200MB, one-time)...')

  try {
    await execa('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' })
    mkdirSync(join(homedir(), '.cache', 'sireno-deck'), { recursive: true })
    writeFileSync(MARKER_PATH, new Date().toISOString())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('ENOTFOUND') || message.includes('network')) {
      console.error('Failed to download Chromium. Check your network connection.')
    } else if (message.includes('EACCES') || message.includes('permission')) {
      console.error(`Failed to install Chromium to ${CACHE_DIR}. Permission denied.`)
    } else {
      console.error(`Failed to install Chromium: ${message}`)
    }
    process.exit(1)
  }
}
```

### yargs flag

```ts
// in cli/index.ts start/emulate command setup
.option('skip-browser-install', {
  type: 'boolean',
  default: false,
  description: 'Skip the check + install of Playwright Chromium',
})
```

The `default: false` works for yargs; the env var is checked in `isSkipped()`.

### Call site

```ts
// in start.ts and emulate.ts, BEFORE any other work
import { ensureChromium } from '../util/chromium-detect.js'

export const command = 'start'
export const describe = 'Start the Stream Deck'
export const handler = async (argv) => {
  await ensureChromium()
  // ... rest of start
}
```

### Tests

```ts
// chromium-detect.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isChromiumInstalled, isSkipped } from './chromium-detect.js'

describe('isSkipped', () => {
  beforeEach(() => { delete process.env.SIRENO_SKIP_BROWSER_INSTALL })
  it('returns false when env not set', () => { expect(isSkipped()).toBe(false) })
  it('returns true when env=1', () => { process.env.SIRENO_SKIP_BROWSER_INSTALL = '1'; expect(isSkipped()).toBe(true) })
})

describe('isChromiumInstalled', () => {
  it('returns false when cache dir missing', () => { /* mocked fs */ })
  it('returns true when marker exists', () => { /* mocked fs */ })
})
```

### Out of scope (deferred)

- Re-check during a long-running session (only checked once at command start)
- Repair mode for corrupted Chromium
- Custom browser path env var
