# Phase 5: Addon System — Research

**Researched:** 2026-05-13
**Phase goal:** Let users install addons from local folders and npm, validate manifests, register custom button/deck types, and ship the emoji selector addon as a validation of the full extension model.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Addon payload validation | Keep using Zod schemas registered by addons, with core validating a stable envelope first | The repo already uses Zod end-to-end, and current config error formatting depends on schema-driven paths that can still feed `ConfigValidationError` line/suggestion handling. Replacing it would add churn exactly where the project already has working validation infrastructure. | [VERIFIED: codebase scan], [CITED: https://zod.dev/] |
| Workspace-packaged built-in addons | Create real workspace packages under `builtin-addons/*` and wire them through `pnpm-workspace.yaml` | The workspace is already configured to include `builtin-addons/*`, and pnpm's workspace protocol is designed to link local packages predictably without falling back to the registry. Right now the directory is missing, so Phase 5 should create the structure instead of inventing a separate built-in path. | [VERIFIED: codebase scan], [CITED: https://pnpm.io/workspaces] |
| Addon package entry points | Use explicit ESM package entry points with `type: module` and `exports` | Node's package docs recommend `exports` for new packages and note that it defines the public API surface. That matters here because addons are an API boundary, and the CLI should import only exported addon entrypoints instead of reaching into arbitrary files. | [CITED: https://nodejs.org/api/packages.html] |
| Dynamic addon loading | Use Node `import()` against resolved package/file entrypoints, with the core loader catching module/manifest failures per addon | Node supports dynamic `import()` in ESM, but ESM resolution is strict about exported subpaths and file resolution. A dedicated loader that resolves one addon at a time and traps failures gives the project the per-addon warning behavior required by ADDN-03. | [CITED: https://nodejs.org/api/esm.html], [CITED: https://nodejs.org/api/packages.html] |
| Button visual output | Keep React as the canonical addon render output and reuse the existing reconciler -> image pipeline | The current code already has the rendering bridge in `render/reconciler.ts` and image composition in `render/text-image.ts`. Reusing that path preserves RENDER-01 and avoids pushing image generation complexity into every addon. | [VERIFIED: codebase scan], [ASSUMED] |

## Common Pitfalls

### Bootstrapping addon-defined schemas too late
**What goes wrong:** The CLI fully validates `config.yml` before addon definitions are loaded, so addon button types either fail as unknown values or force a hardcoded core union forever.
**Why:** The current loader calls `validateConfig()` directly from `loadConfig()` and `validateConfig()` only knows the static `SirenoConfigSchema` union in `packages/cli/src/core/schemas.ts`. [VERIFIED: codebase scan]
**How to avoid:** Split config loading into a bootstrap pass and a full validation pass. Bootstrap only the fields needed to locate addons and the top-level deck envelope, then load addon registrations, then run full button/deck validation with the assembled registry. [VERIFIED: codebase scan], [ASSUMED]

### Letting built-ins keep a special runtime path
**What goes wrong:** External addons use one API while built-in buttons keep separate logic in `deck/runtime.ts`, so the architecture remains coupled and hard to reason about.
**Why:** The current runtime has explicit CPU, memory, fan, media, and toggle knowledge, plus feature-specific render state variants. [VERIFIED: codebase scan]
**How to avoid:** Make built-ins bundled addons loaded through the same loader and registry path as external addons, then reduce the runtime host to activation, key input, scheduling, invalidation, rendering, and navigation orchestration only. [VERIFIED: codebase scan], [ASSUMED]

### Growing the addon API into a kitchen sink too early
**What goes wrong:** The first addon contract becomes hard to version because it exposes too many helpers, lifecycle hooks, and implicit global state.
**Why:** This phase already has a hard-to-reverse API boundary, and the context explicitly says the contract must be versioned from day one. [VERIFIED: `.planning/STATE.md`], [VERIFIED: `.planning/phases/05-addon-system/05-CONTEXT.md`]
**How to avoid:** Keep v1 to explicit button lifecycle methods, command helpers, invalidation, navigation methods, validated config, theme, and a small read-only app context. Defer a generic subscription primitive until a real addon needs it. [VERIFIED: `.planning/phases/05-addon-system/05-CONTEXT.md`]

### Breaking ESM resolution with loose package layouts
**What goes wrong:** Addon packages load in development but fail once packaged or installed through npm because entrypoints are not exported or relative imports omit extensions.
**Why:** Node ESM requires explicit file extensions for relative imports and restricts package entrypoints to declared `exports` when that field exists. [CITED: https://nodejs.org/api/esm.html], [CITED: https://nodejs.org/api/packages.html]
**How to avoid:** Treat addon entrypoints as real packages with explicit `exports`, explicit file extensions on relative imports, and one documented public entrypoint that the CLI loader resolves dynamically. [CITED: https://nodejs.org/api/packages.html], [CITED: https://nodejs.org/api/esm.html]

### Assuming the repo already has bundled addons
**What goes wrong:** Plans and implementation assume `builtin-addons/emoji-selector` already exists because project docs mention it, but the filesystem has no such directory.
**Why:** `AGENTS.md` and `pnpm-workspace.yaml` reference `builtin-addons/*`, yet the repository currently contains only `packages/cli` and no addon packages. [VERIFIED: codebase scan]
**How to avoid:** Make creation of the bundled-addon workspace structure an explicit part of Phase 5 rather than an implied starting point. Planning should not inherit the stale repo metadata. [VERIFIED: codebase scan]

## Existing Patterns in This Codebase

- **Strict validation with rich UX:** `packages/cli/src/core/schemas.ts` and `packages/cli/src/config/loader.ts` already convert the first schema issue into a `ConfigValidationError` with path segments, suggestions, and line-number recovery. Reuse this instead of creating a second validation stack. [VERIFIED: codebase scan]
- **Core-owned polling with jitter:** `packages/cli/src/render/scheduler.ts` already provides bounded-jitter repeated execution and clean stop behavior. This is the right place to keep scheduler ownership while addons only declare cadence. [VERIFIED: codebase scan]
- **Core-owned deck navigation:** `packages/cli/src/deck/controller.ts` already encapsulates active deck and back-stack behavior. Addons should call into this through injected methods, not replace it. [VERIFIED: codebase scan]
- **React output bridge:** `packages/cli/src/render/reconciler.ts` is already the established React-to-render-description boundary. Phase 5 should reuse it as the canonical visual contract for addon buttons. [VERIFIED: codebase scan]
- **Current coupling seam:** `packages/cli/src/deck/runtime.ts` currently owns feature-specific button logic and per-button runtime state variants. This is the main file the architecture pivot is meant to simplify. [VERIFIED: codebase scan]

## Recommended Approach

Plan Phase 5 as an addon-host refactor with tracer bullets that each produce a demoable user-facing result. [VERIFIED: `.planning/phases/05-addon-system/05-CONTEXT.md`] Start by creating the addon registry, manifest contract, bootstrap config loading, and generic runtime host that can instantiate one bundled addon-backed button end-to-end. Then expand the same path to npm/local addon loading and the emoji selector proof. [ASSUMED] Do not try to preserve the old built-in button union or special runtime branches, because the user explicitly chose an addon-first redesign of the config surface and built-in migration through the same registry path as external addons. [VERIFIED: `.planning/phases/05-addon-system/05-CONTEXT.md`]
