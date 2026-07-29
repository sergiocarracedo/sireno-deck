# 06 — Addon Ecosystem

Scope: builtin addon patterns, addon loader, registry, third-party addon contract, addon README drift.

## Findings

### [x] [06-addon-ecosystem #1] [P0] `test-buildin/` addon has no manifest, no README, but is registered in production

**Evidence:** `packages/cli/src/builtin-addons/test-buildin/` has no `sirenodeck.json`; `register-builtins.ts` imports it.
**Impact:** Production bundles test-only addon; users see a "test-buildin" entry.
**Effort:** S
**Fix sketch:** Exclude `test-buildin/` from `register-builtins.ts`; or rename and add a manifest.
**OSS-impression:** First thing a reviewer notices when listing addons.

### [x] [06-addon-ecosystem #2] [P0] Addon READMEs use stale `core:*` names for current addons

**Evidence:** Most addon READMEs document `core:time`, `core:date`, `core:weather`, `core:media-player`, `core:value-display`, `core:brightness`, `core:settings-*`; current names are `date-time:time`, `weather:weather`, `media:player`, etc.
**Impact:** New users copy broken examples.
**Effort:** M
**Fix sketch:** Sweep all addon READMEs; align with `sirenodeck.json` namespace.
**OSS-impression:** Most visible drift.

### [x] [06-addon-ecosystem #3] [P0] `media/README.md` calls addon `media-player`, actual is `media`

**Evidence:** `packages/cli/src/builtin-addons/media/README.md`.
**Impact:** Docs link broken.
**Effort:** S
**Fix sketch:** Rename references.
**OSS-impression:** Path/name mismatch.

### [06-addon-ecosystem #4] [P1] `emoji-selector/README.md` says 8 categories; tests expect 10

**Evidence:** `packages/cli/src/builtin-addons/emoji-selector/__tests__/decks.test.ts` expects 10 categories; README says 8.
**Impact:** Document lies; tests pass against wrong doc.
**Effort:** S
**Fix sketch:** Update README to 10 (or revert tests to 8); add schema-doc test.
**OSS-impression:** Doc/code drift.

### [x] [06-addon-ecosystem #5] [P1] `system-status/README.md` documents 3 button types; manifest registers 1

**Evidence:** `packages/cli/src/builtin-addons/system-status/README.md` vs `manifest.test.ts`.
**Impact:** Users expect features that aren't available.
**Effort:** S
**Fix sketch:** Update README or split manifest.
**OSS-impression:** Documented ≠ shipped.

### [06-addon-ecosystem #6] [P1] `addons` array accepts arbitrary `src` paths with no validation

**Evidence:** Loader reads `addons[i].src` from user YAML.
**Impact:** Path traversal possible (also see 04-security #25).
**Effort:** S
**Fix sketch:** Restrict to project dir or `~/.config/sireno-deck/addons/`.
**OSS-impression:** Path inputs are untrusted.

### [06-addon-ecosystem #7] [P1] Addon loader warns on apiVersion mismatch but still loads

**Evidence:** `addon/loader.ts:217`.
**Impact:** Silent load of incompatible addon.
**Effort:** S
**Fix sketch:** Hard-fail with structured error.
**OSS-impression:** Warning-as-error policy.

### [06-addon-ecosystem #8] [P1] Addon loader does not validate manifest schema strictly

**Evidence:** Loader accepts `sirenodeck.json` with unknown fields.
**Impact:** Typos silently ignored.
**Effort:** S
**Fix sketch:** Zod `.strict()` for manifest schema.
**OSS-impression:** Strict-validation stance.

### [06-addon-ecosystem #9] [P1] Addon schemas use `.strict()` in some places but addon-wide opaque config is expected

**Evidence:** `packages/cli/src/config/schemas.ts:97-102`; `run.ts` expects arbitrary addon-wide config to be preserved.
**Impact:** Schema throws on addon config that the runtime expects to keep.
**Effort:** M
**Fix sketch:** Distinguish top-level strict validation from addon-overrides opaque pass-through; document in ARCHITECTURE.
**OSS-impression:** Schema/implementation contradiction.

### [06-addon-ecosystem #10] [P1] Zod defaults not consistently materialized

**Evidence:** `validateButton()` validates with `safeParse()` but discards `parseResult.data`; runtime carries raw button config and backends re-apply defaults via `??`.
**Impact:** Multiple default sources; surprises when schema changes.
**Effort:** M
**Fix sketch:** Use `parse()` (throws) or thread `parseResult.data`; rely on Zod defaults.
**OSS-impression:** Defaults drift.

### [06-addon-ecosystem #11] [P1] Config naming inconsistency across addons

**Evidence:** `time_zone` vs `poll_interval_ms` vs `windowSeconds` vs `intervalMs` vs `timeoutMs`.
**Impact:** Hard to remember; hot spots for typo bugs.
**Effort:** M
**Fix sketch:** Adopt `snake_case` everywhere (per MIGRATION-NOTES.md) or document a per-namespace convention.
**OSS-impression:** Naming convention absent.

### [06-addon-ecosystem #12] [P1] Addon README examples mix `snake_case` and `camelCase`

**Evidence:** Most addon READMEs.
**Impact:** Confusing for users.
**Effort:** S
**Fix sketch:** Sweep; pick one.
**OSS-impression:** Mixed conventions in examples.

### [x] [06-addon-ecosystem #13] [P1] Several addon READMEs link to nonexistent `os-providers` docs

**Evidence:** Multiple READMEs.
**Impact:** 404 links in docs.
**Effort:** S
**Fix sketch:** Find replacement or remove links.
**OSS-impression:** Broken links.

### [06-addon-ecosystem #14] [P1] `value-display` README lists 6 buttons, manifest has 4

**Evidence:** `packages/cli/src/builtin-addons/value-display/README.md` vs `sirenodeck.json`.
**Impact:** Users expect buttons that don't exist.
**Effort:** S
**Fix sketch:** Reconcile.
**OSS-impression:** Doc vs reality.

### [06-addon-ecosystem #15] [P1] No schema-to-documentation test

**Evidence:** No automated way to verify addon manifest/button schemas match README examples.
**Impact:** Drift inevitable.
**Effort:** M
**Fix sketch:** Add a test that parses each addon README's YAML examples and runs them through `validateButton`.
**OSS-impression:** Drift detection missing.

### [06-addon-ecosystem #16] [P1] Addon loader does not surface capability to addon at load time

**Evidence:** Addon `onLoad(ctx)` receives ctx but no capability advertisement (active-app supported, clipboard, etc.).
**Impact:** Addons must probe; awkward contract.
**Effort:** M
**Fix sketch:** Pass `ctx.capabilities` (per provider).
**OSS-impression:** Capability discovery missing.

### [06-addon-ecosystem #17] [P2] Addon `addons[]` is a config-level list, not a user-level discoverable registry

**Evidence:** No `sireno-deck addons list` command.
**Impact:** Users can't see what's installed.
**Effort:** S
**Fix sketch:** Add a list command that reads from the merged addon registry.
**OSS-impression:** CLI ergonomics.

### [06-addon-ecosystem #18] [P2] Third-party addon install flow not pinned to lockfile

**Evidence:** `installNpmAddon` runs `npm install <spec>` without writing `package-lock.json`.
**Impact:** Supply-chain drift on subsequent installs.
**Effort:** M
**Fix sketch:** Generate lockfile; verify on subsequent installs.
**OSS-impression:** Pinning missing.

### [06-addon-ecosystem #19] [P2] Addon cache path collision possible

**Evidence:** `~/.cache/sireno-deck/node_modules/` per spec but implementation may differ.
**Impact:** Cross-project pollution.
**Effort:** S
**Fix sketch:** Verify path includes project hash; document.
**OSS-impression:** Cache isolation.

### [06-addon-ecosystem #20] [P2] `addons[]` does not support `disabled` toggling

**Evidence:** Schema accepts `enabled` but no CLI toggle.
**Impact:** Users must edit YAML.
**Effort:** S
**Fix sketch:** Add `sireno-deck addons enable/disable <name>`.
**OSS-impression:** Ergonomic gap.

### [06-addon-ecosystem #21] [P2] Addon logger context doesn't include addon name

**Evidence:** Addon context logger (if any) lacks addon prefix.
**Impact:** Hard to grep service logs.
**Effort:** S
**Fix sketch:** Wrap addon's logger to inject `{ addonName }`.
**OSS-impression:** Log hygiene.

### [06-addon-ecosystem #22] [P2] `sirenodeck.json` does not declare schema version

**Evidence:** Manifests lack a `schemaVersion`.
**Impact:** Future schema changes are ad-hoc.
**Effort:** S
**Fix sketch:** Add `schemaVersion: 1`; bump on schema changes.
**OSS-impression:** Schema versioning.

### [06-addon-ecosystem #23] [P2] `addon-decks.ts` test is red

**Evidence:** `cli/commands/__tests__/addon-decks.test.ts`; generated deck shape mismatch.
**Impact:** Coverage broken.
**Effort:** S
**Fix sketch:** Update test or fix shape.
**OSS-impression:** Failing test.

### [06-addon-ecosystem #24] [P2] `addon-core-lock.test.ts` is red

**Evidence:** `deck/__tests__/addon-core-lock.test.ts`; obsolete core lock registration expectation.
**Impact:** Coverage broken.
**Effort:** S
**Fix sketch:** Reconcile with current behavior.
**OSS-impression:** Stale test.

### [06-addon-ecosystem #25] [P2] No addon development guide

**Evidence:** No `docs/addon-development.md`.
**Impact:** New addon authors must read source.
**Effort:** M
**Fix sketch:** Write an addon-author guide referencing existing builtins as templates.
**OSS-impression:** Missing docs.

### [06-addon-ecosystem #26] [P2] `addon-handler-bridge` does not enforce addon-deck uniqueness

**Evidence:** Two addons registering the same deck id should conflict; behavior undefined.
**Impact:** Subtle ordering bug.
**Effort:** S
**Fix sketch:** Detect duplicate deck ids; emit `addon-deck-conflict` signal.
**OSS-impression:** Edge case.

### [06-addon-ecosystem #27] [P3] `addons` config validation is non-strict on `addons[]`

**Evidence:** Schema allows unknown keys.
**Impact:** Typos silently ignored.
**Effort:** S
**Fix sketch:** `.strict()` on the addon entry schema.
**OSS-impression:** Strict validation stance.

### [06-addon-ecosystem #28] [P3] Addon cache has no version check

**Evidence:** Re-running install with same version re-installs.
**Impact:** Slow re-installs.
**Effort:** S
**Fix sketch:** Compare installed version; skip if current.
**OSS-impression:** Cache hygiene.

### [06-addon-ecosystem #29] [P3] Several addon frontends have no direct tests

**Evidence:** Many addon `frontend.tsx` files.
**Impact:** Surface bugs in addon UI.
**Effort:** L
**Fix sketch:** Add jsdom tests for each frontend.
**OSS-impression:** Coverage gap.

### [06-addon-ecosystem #30] [P3] No first-party example addon published

**Evidence:** `packages/addon-app-shortcuts/` is the only external example; it's a workspace package, not a publishable template.
**Impact:** External authors don't have a clear starting point.
**Effort:** M
**Fix sketch:** Add a `examples/` addon published as `@sireno-deck/example-addon`.
**OSS-impression:** Missing template.

### [06-addon-ecosystem #31] [P3] `addon-registry.ts` is 474 LoC with mixed responsibilities

**Evidence:** Discovery (regex over `index.ts`, JSON manifest scan, regex fallback) + `validateBuiltinButtonConfigs`.
**Impact:** Hard to test; hard to extend.
**Effort:** M
**Fix sketch:** Split discovery into `discover-by-manifest` + `discover-by-fallback`; isolate validation.
**OSS-impression:** Largest addon file.

### [06-addon-ecosystem #32] [P4] README snippets don't escape backticks in code blocks

**Evidence:** Several addon READMEs.
**Impact:** Visual rendering glitches.
**Effort:** S
**Fix sketch:** Sweep.
**OSS-impression:** Doc style.

### [06-addon-ecosystem #33] [P4] Some addon buttons reuse same `accent` color across variants

**Evidence:** Several manifest entries.
**Impact:** Visual monotony.
**Effort:** S
**Fix sketch:** Diversify.
**OSS-impression:** Visual polish.

### [06-addon-ecosystem #34] [P4] `test-buildin/` test file name has typo

**Evidence:** `test-buildin` not `test-builtin`.
**Impact:** Typos in paths propagate.
**Effort:** S
**Fix sketch:** Rename.
**OSS-impression:** Sloppy naming.
