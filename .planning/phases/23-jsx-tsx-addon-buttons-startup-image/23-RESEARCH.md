# Phase 23: JSX/TSX Addon Authoring + Startup Placeholder - Research

**Researched:** 2026-05-25
**Phase goal:** Let local addons load raw JSX/TSX-authored button modules through the existing addon contract, and show a temporary branded image on physical Stream Deck hardware while the browser renderer is still booting and before the first real deck capture arrives.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Treating local raw-source addons like full TypeScript projects | Keep raw-source support manifest-driven and fixed-policy, and load only local `sirenoAddon.main` entries ending in `.ts`, `.tsx`, `.js`, or `.jsx` | The phase context explicitly rejects path aliases, project references, and project-aware compilation; `packages/cli/src/addon/loader.ts` already has the right manifest-owned seam, so widening the contract would create user expectations the phase does not intend to honor | [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`], [VERIFIED: `packages/cli/src/addon/loader.ts`] |
| Using Node native TypeScript execution for TSX addon source | Use a Sireno-owned transpile/runner path rather than Node's native type-stripping mode | Node's native TypeScript support does not use `tsconfig.json`, does not type-check, and only handles erasable syntax cleanly, which is the wrong fit for `.tsx` entrypoints and a repo-owned JSX policy | [CITED: https://nodejs.org/learn/typescript/run-natively] |
| Inventing a second public JSX contract | Keep addon authoring on the package root export only and do not restore `./jsx` as public API | The current shipped authoring contract already returns `ReactElement` from `render()` and the package only exports `"."`; adding a second public surface would contradict the locked phase decision and recreate old drift | [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`], [VERIFIED: `packages/cli/src/addon/api.ts`], [VERIFIED: `packages/cli/src/index.ts`], [VERIFIED: `packages/cli/package.json`] |
| Re-implementing source-graph rules from scratch | Mirror the narrow relative-import graph policy already used by theme runtime source loading | `packages/cli/src/config/theme.ts` already walks a bounded source graph, resolves only relative or absolute specifiers, and limits candidate extensions to the same family this phase needs. That is the cleanest in-repo precedent for "relative imports only, no alias magic" | [VERIFIED: `packages/cli/src/config/theme.ts`] |
| Modeling the startup placeholder as a fake runtime deck | Write the placeholder at the hardware startup seam in `start.ts`, before the first successful browser capture, and replace it with the first real render | `packages/cli/src/deck/runtime.ts` already owns the steady-state runtime deck contract and its own reload-error fallback; adding a fake startup deck there would blur runtime truth. `start.ts` already owns browser startup and physical buffer writes, so it is the honest temporary placeholder seam | [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`], [VERIFIED: `packages/cli/src/deck/runtime.ts`], [VERIFIED: `packages/cli/src/cli/commands/start.ts`], [VERIFIED: `packages/cli/src/render/browser-renderer.ts`] |

## Common Pitfalls

### Native Node TypeScript looks simpler than it is
**What goes wrong:** The implementation leans on Node's native TypeScript support and then discovers that `.tsx`, JSX transforms, and tsconfig-shaped expectations do not line up with the phase contract. [CITED: https://nodejs.org/learn/typescript/run-natively]
**Why:** Native support sounds like "TypeScript just runs now," but the documented model is intentionally narrow and does not become a general JSX/TSX compiler. [CITED: https://nodejs.org/learn/typescript/run-natively]
**How to avoid:** Treat Phase 23 as a runtime-owned transpile problem, not a native-Node shortcut. Keep one Sireno-controlled loader policy for local raw source. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] [VERIFIED: `packages/cli/src/addon/loader.ts`]

### Supporting broad tsconfig behavior will quietly explode scope
**What goes wrong:** Authors expect `paths`, project references, package-level build graphs, or arbitrary resolution rules to work once raw `.tsx` is accepted. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`]
**Why:** TypeScript's `bundler` resolution model explicitly differs from Node-style resolution, especially around extensionless imports and package boundary behavior, so "just honor the addon tsconfig" becomes a real compiler-product commitment. [CITED: https://www.typescriptlang.org/tsconfig/moduleResolution.html]
**How to avoid:** Keep the contract narrow and explicit: manifest main only, relative imports only, fixed Sireno policy only. Add tests that lock out alias-style imports so the boundary stays obvious. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] [VERIFIED: `packages/cli/src/addon/loader.test.ts`]

### A startup placeholder can accidentally lie about runtime state
**What goes wrong:** The device keeps showing a branded boot image after browser startup has already failed, which makes the daemon look healthy when it is not. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`]
**Why:** Temporary visuals are easy to wire as a fallback and then forget to clear on the failure path. The emulator already demonstrates that startup, ready, and error are distinct states; the physical device path just lacks the startup visual today. [VERIFIED: `packages/cli/src/cli/commands/start.ts`]
**How to avoid:** Track "first successful real render pending" explicitly in `start.ts`, write the placeholder only during that state, and let the existing honest failure path take over if browser startup or first render fails. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`]

### Import-graph widening will create security and predictability drift
**What goes wrong:** The loader starts following package imports, aliases, or parent-directory escapes from addon source, making startup behavior harder to reason about and harder to keep inside the addon root. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`]
**Why:** Dynamic runtime loading is already a trust boundary; once raw source is allowed, unbounded resolution rules turn a narrow phase into an open-ended runtime bundler. [ASSUMED]
**How to avoid:** Reuse the theme runtime graph pattern: only resolve relative imports, bound resolution to the addon root, and keep the candidate extension list explicit. [VERIFIED: `packages/cli/src/config/theme.ts`] [VERIFIED: `packages/cli/src/addon/loader.ts`]

## Existing Patterns in This Codebase

- **Manifest-owned addon loading already exists:** `readAddonManifest()` and `importAddon()` in `packages/cli/src/addon/loader.ts` already make `sirenoAddon.main` the authority for addon startup. Phase 23 should extend that seam instead of adding discovery-by-convention. [VERIFIED: `packages/cli/src/addon/loader.ts`]

- **The public authoring surface is already root-export based:** `packages/cli/src/addon/api.ts` defines `AddonButtonInstance.render(): ReactElement` plus the shared DOM helpers, and `packages/cli/src/index.ts` exposes those helpers through the package root. That is already the modern TSX authoring path. [VERIFIED: `packages/cli/src/addon/api.ts`] [VERIFIED: `packages/cli/src/index.ts`]

- **There is already one narrow source-graph walker in the repo:** `collectThemeRuntimeFilePaths()` and friends in `packages/cli/src/config/theme.ts` prove the repo already accepts a bounded runtime-source graph policy when the scope is explicit. [VERIFIED: `packages/cli/src/config/theme.ts`]

- **The hardware write seam is centralized:** `startDaemon()` in `packages/cli/src/cli/commands/start.ts` owns browser startup, runtime creation, and the write of captured key buffers to the physical device. That is the right place to inject and clear a temporary hardware-only boot visual. [VERIFIED: `packages/cli/src/cli/commands/start.ts`]

- **The steady-state runtime render contract is already clear:** `renderRuntimeButton()` in `packages/cli/src/deck/runtime.ts` normalizes button output through `ButtonSurface`, and the runtime already has its own reload-error fallback deck. Startup placeholder behavior should not be modeled as another runtime deck type. [VERIFIED: `packages/cli/src/deck/runtime.ts`]

- **Tests already exercise the right seams:** `packages/cli/src/addon/loader.test.ts` covers loader warnings and manifest behavior, and `packages/cli/src/cli/commands/start.test.ts` already mocks lifecycle and browser startup. That makes both Phase 23 behaviors testable without inventing a new harness. [VERIFIED: `packages/cli/src/addon/loader.test.ts`] [VERIFIED: `packages/cli/src/cli/commands/start.test.ts`]

## Recommended Approach

Use two narrow vertical slices. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] Confidence: HIGH

First, extend `packages/cli/src/addon/loader.ts` so local addons can point `sirenoAddon.main` at raw `.ts`, `.tsx`, `.js`, or `.jsx` files, but only through a fixed Sireno policy and only with sibling relative imports inside the addon root. Keep npm addons and already-built JavaScript on the current import path, and lock the contract with a committed raw-source fixture plus loader/start-path coverage. [VERIFIED: `packages/cli/src/addon/loader.ts`] [VERIFIED: `packages/cli/src/addon/loader.test.ts`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`] Confidence: HIGH

Second, add a small startup-placeholder helper and wire it from `packages/cli/src/cli/commands/start.ts` so physical devices receive a branded temporary image immediately after startup begins, then switch to the first real browser-backed capture as soon as it exists. Do not leave the placeholder in place on failure; let the current startup error behavior stay honest. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] [VERIFIED: `packages/cli/src/cli/commands/start.ts`] [VERIFIED: `packages/cli/src/render/browser-renderer.ts`] Confidence: HIGH

Keep the public authoring surface unchanged while doing this work. The shipped proof for Phase 23 should import only from `sireno-deck-cli` root exports and should not mention `./jsx` as a supported entrypoint anywhere new. [VERIFIED: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`] [VERIFIED: `packages/cli/package.json`] [VERIFIED: `packages/cli/src/index.ts`] Confidence: HIGH

## Source Notes

- DuckDuckGo HTML search was used only to locate current official documentation before reading upstream sources directly. [ASSUMED]
- `tsx` remains the strongest likely runtime-loader candidate because it is already present in `packages/cli/package.json`, but the public `tsx` docs were not retrievable cleanly through this environment, so implementation choice should still be validated against the live installed package/API during execution. [VERIFIED: `packages/cli/package.json`] [ASSUMED]

---
*Phase: 23-jsx-tsx-addon-buttons-startup-image*
*Research gathered: 2026-05-25*
