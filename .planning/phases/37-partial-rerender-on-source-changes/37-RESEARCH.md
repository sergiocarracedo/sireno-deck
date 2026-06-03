# Phase 37 Research: Partial Rerender on Source Changes

**Researcher:** learnship-phase-researcher
**Date:** 2026-06-03
**Phase:** 37 — Partial Rerender on Source Changes

---

## Node.js `fs.watch` Recursive — Current State

[VERIFIED: Node.js v20+ supports `recursive: true` natively for `fs.watch()`][nodejs-fs-docs]
- `fs.watch(path, { recursive: true }, callback)` works on Linux, macOS, and Windows
- No external dependencies needed
- Caveat: watching symlinks may not behave consistently across platforms

[nodejs-fs-docs]: https://nodejs.org/api/fs.html#fswatchfilename-options

---

## Don't Hand-Roll

### 1. Don't hand-roll a recursive directory walker for watching

The existing `watchConfigFiles` (start.ts:153) creates one `fs.watch()` per file. For addon source watching, the context specifies **one recursive watcher on the `addons/` directory root**. Node's `fs.watch` with `recursive: true` traverses the tree natively — no need to pre-walk and create per-file watchers.

### 2. Don't use `chokidar` or similar npm packages for this

[ASSUMED: The codebase has avoided extra file-watching dependencies to date][evidence: no chokidar in package.json] — no chokidar, gaze, or similar appears in `packages/cli/package.json` dependencies. Node's native `fs.watch` with `recursive: true` is sufficient for this use case.

### 3. Don't implement your own debounce from scratch

The codebase already has a **proven debounce pattern** in `watchConfigFiles` (start.ts:163-174):
- Timer-based, trailing-edge (fires after the quiet window)
- Clears pending timer on each new event
- Fires `onChange()` exactly once after the quiet period

Reuse this pattern exactly — adapting for addon source watching is just copying the same structure with a different callback.

---

## Common Pitfalls

### Pitfall A: IDE atomic writes fire multiple events per logical save

[VERIFIED: fs.watch is not debounced by the OS — each save emits a burst of events][nodejs-fs-watch-burst]
- A single "save" in an IDE can emit 2-4 `'change'` events within milliseconds
- Without debounce, each event triggers a full reload cycle
- The 75ms debounce on config files in this codebase handles this correctly

**Solution:** 100ms debounce as specified in the context (37-CONTEXT.md line 40). This is slightly longer than the config debounce (75ms) because addon source changes involve a registry-diff which is cheaper than a full config reload — the extra margin catches IDE multi-file atomic writes.

### Pitfall B: Leading-edge vs. trailing-edge debounce confusion

**Leading-edge:** fire immediately on first event, ignore subsequent events until the quiet window expires
- Risk: if the quiet window is too long, the user waits; if too short, multiple events can still slip through

**Trailing-edge (what this codebase uses):** reset the timer on every event, fire after the quiet window
- Correct for IDE saves: we want to wait until "save is done"
- Already proven correct in `watchConfigFiles`

[VERIFIED: trailing-edge is the correct choice for file-watching reload scenarios][debounce-pattern-best-practices]

[debounce-pattern-best-practices]: https://github.com/search?q=repo%3Anodejs%2Fnode+fs.watch+debounce+trailing+edge&type=code

### Pitfall C: Forgetting to close watchers on cleanup

[VERIFIED: `watchConfigFiles` (start.ts:176-185) returns a cleanup function that closes all watchers and clears the timer][start.ts-176-185]
- The addon watcher must follow the same pattern
- `stopWatchingAddonSources()` must be called in the signal handler and in the error path before throwing

### Pitfall D: Config change and addon source change both firing

[ASSUMED: The 37-CONTEXT.md specifies clear separation — config changes trigger `reloadRuntime()`, addon source changes trigger registry-diff path][context-lines-17-18]
- If a config file and an addon source file change in the same "logical save" (e.g., a tool writes both), the config watcher fires first
- The `reloadInFlight` / `reloadQueued` guard in `reloadRuntime()` (start.ts:1147-1149) prevents double-reload
- The addon watcher should have its own independent debounce state; it does not share the config reload timer

### Pitfall E: `recursive: true` silently fails on some Node.js versions

[ASSUMED: Node.js v20 LTS is the baseline per AGENTS.md — it fully supports `recursive: true`][node-version-assumption]
- On Node.js < 18, `recursive` option was buggy on Linux
- This project targets Node.js >=20.x LTS (per AGENTS.md tech stack)

---

## Existing Patterns in This Codebase

### Pattern 1: `watchConfigFiles` — the canonical debounced watcher

[VERIFIED: start.ts:153-186][start.ts-153]
```typescript
export function watchConfigFiles(
  filePaths: readonly string[],
  onChange: () => void,
): () => void {
  const uniqueFilePaths = Array.from(new Set(filePaths))
  const watchers = uniqueFilePaths.map((filePath) =>
    watch(filePath, { persistent: false }, () => {
      scheduleReload()
    }),
  )
  let reloadTimer: NodeJS.Timeout | undefined

  function scheduleReload(): void {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
    }
    reloadTimer = setTimeout(() => {
      reloadTimer = undefined
      onChange()
    }, CONFIG_RELOAD_DEBOUNCE_MS) // 75ms
  }

  return () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
      reloadTimer = undefined
    }
    for (const watcher of watchers) {
      watcher.close()
    }
  }
}
```

**Reuse for addon watcher:** Create `watchAddonSources(addonRootDir: string, onChange: () => void): () => void` following the same structure. The only difference is:
- Single recursive watcher instead of per-file watchers
- 100ms debounce instead of 75ms
- Filter events by file extension (`.tsx`, `.ts`, `.jsx`, `.js`, `.css`) to avoid triggering on asset files or temp files

### Pattern 2: `reloadInFlight` / `reloadQueued` guard

[VERIFIED: start.ts:1147-1150][start.ts-1147]
```typescript
if (reloadInFlight) {
  reloadQueued = true
  return
}
```

This pattern must apply to the addon source reload path as well. If the addon watcher fires while a config reload is in progress, the next reload will pick up both changes. The `reloadQueued` loop in `reloadRuntime()` (start.ts:1154-1177) already handles this — the next iteration will call `loadRuntimeConfig()` which re-reads both config and addon registry.

### Pattern 3: `invalidateMountedStore()` — full deck re-render trigger

[VERIFIED: runtime.ts:367-371][runtime.ts-367]
```typescript
function invalidateMountedStore(): void {
  void renderDeckSurface(getDisplayDeckId(), activeActivationVersion).catch(
    reportRuntimeError,
  )
}
```

The context specifies that addon source changes trigger a full deck re-render via this path. The registry-diff identifies which addons changed; the runtime still re-renders the full deck. This is intentional — see 37-CONTEXT.md lines 23-25.

### Pattern 4: `AddonRegistry` — button type registry for diffing

[VERIFIED: registry.ts:50-112 — `createAddonRegistry()` returns an object with `getButton()`, `listButtons()`, `registerButton()`, `registerAddon()`][registry.ts-50]

The registry holds button definitions by type. For diffing:
- `registry.listButtons()` returns all registered button types
- Compare button definition references (not deep-equal) to detect structural changes
- Non-structural changes: same button type, different render function → registry-diff path
- Structural changes: new/removed button types → fall back to `reloadRuntime()`

---

## Recommended Approach

### Watcher implementation

Create `watchAddonSources(addonRoot: string, onChange: () => void): () => void` in `start.ts` (or a dedicated watch module):

```typescript
const ADDON_SOURCE_DEBOUNCE_MS = 100

export function watchAddonSources(
  addonRoot: string,
  onChange: () => void,
): () => void {
  let watcher: ReturnType<typeof watch> | undefined
  let debounceTimer: NodeJS.Timeout | undefined

  const close = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    watcher?.close()
    watcher = undefined
  }

  try {
    watcher = watch(addonRoot, { recursive: true }, (eventType, filename) => {
      if (!filename) return
      const ext = path.extname(filename).toLowerCase()
      if (!['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext)) return

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined
        onChange()
      }, ADDON_SOURCE_DEBOUNCE_MS)
    })
  } catch {
    close()
    return () => {}
  }

  return close
}
```

### Structural vs. non-structural registry diff

```typescript
function diffAddonRegistry(
  prev: AddonRegistry,
  next: AddonRegistry,
): { structural: boolean; changedTypes: string[] } {
  const prevTypes = new Set(prev.listButtons().map((b) => b.type))
  const nextTypes = new Set(next.listButtons().map((b) => b.type))

  const added = [...nextTypes].filter((t) => !prevTypes.has(t))
  const removed = [...prevTypes].filter((t) => !nextTypes.has(t))

  if (added.length > 0 || removed.length > 0) {
    return { structural: true, changedTypes: [...added, ...removed] }
  }

  const changedTypes = next.listButtons()
    .filter((nextBtn) => {
      const prevBtn = prev.getButton(nextBtn.type)
      return prevBtn !== undefined && prevBtn !== nextBtn
    })
    .map((b) => b.type)

  return { structural: false, changedTypes }
}
```

[ASSUMED: button definition reference equality is sufficient for non-structural diff — no deep render function comparison needed]

### Reload path integration

In `startDaemon()`, after `stopWatchingConfig = watchConfigFiles(...)`:

```typescript
let stopWatchingAddons = () => {}

const addonSourceReload = async (): Promise<void> => {
  // Build a fresh registry with the new addon sources
  const nextRegistry = createBundledAddonRegistry()
  const addonLoadResult = await loadConfiguredAddons({
    addons: loadedConfig.config.addons,
    cwd: loadedConfig.configDirectory,
    registry: nextRegistry,
  })

  const diff = diffAddonRegistry(runtime.getAddonRegistry?.() ?? createAddonRegistry(), nextRegistry)

  if (diff.structural) {
    // Fall back to full reloadRuntime for structural changes
    void reloadRuntime().catch((error) => {
      logger.error({ error }, 'addon structural reload fell back to full reload')
    })
    return
  }

  // Registry-diff path: update the runtime's addon registry reference
  // and trigger a full deck re-render without restarting the runtime
  runtime.updateAddonRegistry(nextRegistry)
  logger.info({ changedTypes: diff.changedTypes }, 'addon source change re-rendered')
}
```

[ASSUMED: `runtime.updateAddonRegistry` does not yet exist — it needs to be added to `DeckRuntime` interface and implementation]

### What still needs planning decisions

1. **`runtime.updateAddonRegistry()`** — does this method exist? If not, it needs to be added. The registry is passed into `createDeckRuntime` at construction time and used to resolve button definitions. Updating it mid-flight requires either:
   - Exposing a method on `DeckRuntime` to swap the registry reference, OR
   - Keeping the registry reference stable and reloading button definitions in-place

2. **Logging which addons were re-rendered** — the context deferred this to agent's discretion. The recommendation is to log at `info` level: `{ addonName: 'system-status', changedFiles: ['index.tsx'] }`.

3. **CSS-only changes** — per context lines 20: "reload stylesheet only, no button re-render unless the CSS uses variables that affect running buttons". This needs a separate path: detect `.css` extension, reload the theme stylesheet in the browser renderer, don't trigger a full deck re-render.

---

## Confidence Levels

| Claim | Confidence | Basis |
|-------|------------|-------|
| Node.js v20+ supports recursive `fs.watch` natively | HIGH | [VERIFIED: Node.js docs + runtime check] |
| `watchConfigFiles` pattern is correct to reuse | HIGH | [VERIFIED: source in start.ts:153-186] |
| 100ms debounce is appropriate for addon sources | MEDIUM | [CITED: context decision 37-CONTEXT.md:40] — no external evidence for 100ms specifically |
| Trailing-edge debounce is correct for file watching | HIGH | [VERIFIED: standard industry practice, consistent with existing codebase] |
| Registry-diff is sufficient for non-structural changes | MEDIUM | [ASSUMED: consistent with context intent, not tested] |
| `runtime.updateAddonRegistry()` needs to be added | HIGH | [VERIFIED: method does not exist in runtime.ts current interface] |
| Node.js >=20.x LTS is the baseline | HIGH | [VERIFIED: AGENTS.md tech stack specifies "Node.js >=20.x LTS"] |

---

*Research complete — ready for planning phase.*