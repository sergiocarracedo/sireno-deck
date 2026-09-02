---
title: Installer runtime tree via pnpm deploy
date: 2026-08-11
category: docs/solutions/build/
module: packages/cli
problem_type: tooling_decision
component: build
severity: medium
applies_when:
  - Building a distributable CLI whose code runs native addons (node-hid, sharp, dbus, get-windows)
  - Evaluating Node.js SEA / single-binary bundling for an app that needs a real node_modules at runtime
tags: [pnpm, deploy, sea, native-addons, tsdown, bundling]
---

# Installer runtime tree via pnpm deploy

## Context

The sireno-deck CLI was to ship as a single self-contained artifact. Two candidate approaches:

1. **Node.js SEA (single executable application)** — postject blob with an embedded snapshot.
2. **tsdown ESM bundle + a pruned runtime `node_modules` tree** staged by `pnpm deploy`, packaged into per-OS installers.

SEA was rejected. Native addons (`sharp`, `@elgato-stream-deck/node`, `dbus-next`, `get-windows`, `usocket`, `@julusian/jpeg-turbo`) ship prebuilt `.node` binaries / native builds that a JS bundle cannot embed — the blob is JavaScript only. The frontend/emulator (HTML/CSS/assets) likewise cannot be `sea://`-ed. So the "single binary" was never real for this app: an unpacked tree of real modules at runtime is required regardless.

The installer therefore unpacks a **pruned dependency tree** (`pnpm deploy`) that:

- Contains only production deps (no dev tooling).
- Runs the postinstall native builds (`get-windows` node-gyp, `sharp` prebuilt download) — driven by `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- Links a working `bin` entry (the `bin` map must point at a file that actually exists — `./bin/sireno.js` declared a nonexistent file; the real wrapper is `bin/sirenodeck.js`).

## Guidance

### Native deps are external to the bundle

In `tsdown.config.ts` the native addons (plus `playwright`/`playwright-core` and `vite`) are listed in `deps.neverBundle` (the current replacement for the deprecated `external` option). The bundle resolves them from the installed `node_modules` at runtime. `dts: false` is required — tsdown tries to emit type declarations by default and fails under the CLI's TS config.

### `pnpm deploy` on pnpm v10 needs `--legacy`

The staging script runs:

```bash
pnpm --filter sirenodeck deploy --legacy <staging>/sireno
```

Without `--legacy`, pnpm v10 fails with `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE` because the workspace has non-injected deps. The flag restores the v9 deploy semantics.

### The staged tree layout

```
<sireno>/lib/cli/main.mjs      # tsdown bundle (entry + code-split chunks)
<sireno>/frontend/dist/        # vite build
<sireno>/config-ui/dist/       # vite build
<sireno>/etc/install.json      # { version, platform, arch }
<sireno>/node_modules/         # pruned prod deps, native builds done
<sireno>/sirenodeck            # POSIX sh launcher (prefers bundled node)
<sireno>/sirenodeck.cmd        # Windows launcher
```

The launcher exports `SIRENO_INSTALL_ROOT` and execs `node <root>/lib/cli/main.mjs`. The installed Node runtime is vendored per-OS into `.app`/`.exe`/Flatpak; brew/deb/rpm rely on the package manager's node.

### Install-root resolution replaces `import.meta.url` derivation

A single-file bundle makes `import.meta.url`-relative paths wrong. `resolveInstallRoot()` (`src/cli/install-root.ts`) checks `SIRENO_INSTALL_ROOT` env, then walks up looking for `etc/install.json` or `frontend/dist/index.html` markers, and only falls back to dev behavior. `start.ts`'s `resolveFrontendDist()`, emulator cwd resolution, and the theme dir all route through it.

## When to Apply

- Shipping a CLI with native addons as a "single binary" — the tree approach is the only one that works.
- Staging a runnable copy of a pnpm workspace package without dev deps.
- Any `import.meta.url`-relative file resolution that breaks when bundling to one file.

## Related

- `packages/cli/tsdown.config.ts` — externals + `dts: false`
- `packages/cli/scripts/installer/_shared/prepare-runtime-tree.mjs` — the `deploy --legacy` staging step
- `packages/cli/src/cli/install-root.ts` — install-root resolution
- `docs/solutions/build/playwright-runtime-first-run-install.md` — the other piece of the runtime story
