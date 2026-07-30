---
title: "@vitejs/plugin-react v4 emits three esbuild deprecation warnings on every dev server start"
date: 2026-07-30
last_updated: 2026-07-30
category: docs/solutions/runtime-errors/
module: packages/cli/frontend
problem_type: runtime_error
component: tooling
severity: low
symptoms:
  - "[vite] warning: `esbuild` option was specified by \"vite:react-babel\" plugin"
  - "[vite] warning: `optimizeDeps.esbuildOptions` option was specified by \"vite:react-babel\" plugin"
  - "You or a plugin you are using have set `optimizeDeps.esbuildOptions` but this option is now deprecated"
  - "All three warning lines appear on every `vite` startup and every `node bin/dev.js run`"
root_cause: config_error
resolution_type: dependency_update
tags:
  - vite
  - plugin-react
  - esbuild
  - deprecation
  - dev-server
  - frontend-tooling
  - babel
  - oxc
related_components:
  - packages/cli/package.json
  - packages/cli/frontend/vite.config.ts
---

# @vitejs/plugin-react v4 emits three esbuild deprecation warnings on every dev server start

## Problem

Every time the sireno-deck dev server (`node bin/dev.js run` or `npx vite` in
`packages/cli/frontend`) starts, Vite logs three deprecation warnings before
the "ready" line. The warnings are noise that has been on the screen since the
project pinned the plugin, and they obscure the real `[vite]` messages that
follow — pre-transform errors, transform warnings, dynamic-import failures.

## Symptoms

Three warning lines appear on every dev server start, in this order:

```
[vite] warning: `esbuild` option was specified by "vite:react-babel" plugin
  - this option is now deprecated and will be removed in a future release
[vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin
  - this option is now deprecated and will be removed in a future release
You or a plugin you are using have set `optimizeDeps.esbuildOptions` but
this option is now deprecated
```

The frontend still serves. JSX still transforms. Build output is unchanged.
The warnings are pure noise — but they mask real `[vite]` messages that appear
lower in the log, and they pollute every CI/dev log forever.

## What Didn't Work

- **Trying v5 first.** `@vitejs/plugin-react@^5` is the version that drops the
  Babel plugin and switches to Oxc for JSX. But before v6, v5 still emits
  `optimizeDeps.esbuildOptions` in some path on Vite 6.x. Diagnosis: not what
  was actually happening — the project was on v4, not v5. v4 was the source.
- **Trying `@vitejs/plugin-react@^6`.** v6 removes the Babel plugin entirely
  and is the cleanest target, but its peer-dep is `vite@^8.0.0`. The project
  is on Vite 6.4.3; `pnpm install` rejects the upgrade with `unmet peer
  vite@^8.0.0: found 6.4.3`. v6 is not installable without also bumping Vite,
  which is its own migration.
- **Configuring the warnings away.** Vite 6 does not expose a flag to
  suppress plugin-level deprecation warnings — they are hard-coded in the
  Vite core. Plugins that emit deprecated options cannot be silenced by
  user config; the only fix is to stop emitting the deprecated options.

## Solution

Bump `@vitejs/plugin-react` from `^4.3.4` to `^5.0.0` in
`packages/cli/package.json`. v5 swaps the Babel-based JSX transform for Oxc
and drops the `esbuild` / `optimizeDeps.esbuildOptions` config in the
process. The three warnings disappear.

```json
// packages/cli/package.json
{
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^6.4.3"
  }
}
```

After `pnpm install`, `pnpm-lock.yaml` resolves `@vitejs/plugin-react@5.2.0`.
Running `npx vite` from `packages/cli/frontend` now starts with:

```
  VITE v6.4.3  ready in 228 ms
  ➜  Local:   http://127.0.0.1:5180/
```

No `vite:react-babel`, no `optimizeDeps.esbuildOptions`, no `esbuild`
deprecation. The pre-transform error about `sireno-deck-theme` that appears
next is the same one that was always there — it needs `SIRENO_THEME` env to
be set by the daemon, unrelated to the plugin bump.

## Why This Works

Vite 6 still ships the legacy `vite:react-babel` plugin (the Babel-based JSX
transform with esbuild options). `@vitejs/plugin-react@4` re-uses that plugin
and exposes its `esbuild` / `optimizeDeps.esbuildOptions` configuration. Vite
6 detects those options when the plugin initialises and emits a deprecation
warning for each one.

`@vitejs/plugin-react@5` swaps the JSX transform to Oxc and no longer
initialises the legacy Babel plugin — so Vite sees no `esbuild` options being
configured and emits no warnings.

`@vitejs/plugin-react@6` would also fix the warnings but requires Vite 8+. The
project is on Vite 6.4.3, so v6 is not installable without a coordinate Vite
bump. v5 is the best installable target for the current Vite 6.x line.

## Prevention

- **Track plugin versions as part of the toolchain's lifecycle.** When a
  plugin's options are deprecated by its host, the warning is observable
  immediately. Treat repeated `[vite] warning: ...` lines as a dependency
  to triage, not as noise to ignore.
- **Lock the plugin to a version that matches the host version.** v4 and v5
  of `@vitejs/plugin-react` are compatible with Vite 6.x; v6 requires Vite 8+.
  Pin within the compatible range and revisit the constraint when the host
  bumps.
- **Audit other plugins for the same pattern.** Any plugin that initialises
  with `esbuild` or `optimizeDeps.esbuildOptions` on Vite 6 will emit the
  same three warnings. Grep your dev server log for `vite:react-babel` and
  the corresponding `optimizeDeps.esbuildOptions` text — if other plugins
  re-use the legacy Babel plugin, they need the same treatment.
- **Verify after a bump.** Run `npx vite` in the frontend workspace and
  `rg -e "vite:react-babel" -e "optimizeDeps.esbuildOptions" -e "esbuild.*deprecated" /tmp/vite-out.log`
  on the captured output. Zero matches means the warnings are gone.

## Related Issues

- `@vitejs/plugin-react` documented version compatibility:
  - v4 — Vite 4–6 (legacy Babel plugin)
  - v5 — Vite 4–7 (Oxc-based JSX, drops `esbuild` options)
  - v6 — Vite 8+ (Oxc-based JSX, drops Babel entirely)
- `docs/solutions/conventions/vite-plugin-oxc-requires-quoted-hyphen-keys.md` — Oxc parser rules in this project's in-source tooling; relevant when bumping to a Vite version that uses Oxc natively.
- PR #18 — landed the bump `^4.3.4 → ^5.0.0` together with the session-provider fix. Commit `3c120779`.
- `packages/cli/package.json` — the dependency declaration that needs to track the plugin's host-version compatibility.
