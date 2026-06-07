# Quick Task 039: Ban `.js` import extensions and adopt `@` alias

**Created:** 2026-06-07
**Status:** Planned
**Roadmap link:** none (cross-cutting code hygiene; not tied to a v1.x phase)

## Goal

Stop writing `.js` extensions in TS/TSX imports. Use the existing `@/*` alias for any import that crosses a first-level `packages/cli/src/` folder boundary. Enforce both with `oxlint` so the rules can't drift back.

## Locked decisions (from pre-plan Q&A 2026-06-07)

- **Alias rule (loose):** Use `@/...` whenever the source file and the target file live under different first-level `packages/cli/src/` subdirectories (e.g., `render/` ↔ `util/`). Same first-level dir → relative is fine. For `src/builtin-addons/<addon>/`, the **addon root** is the boundary: any import that stays inside one addon keeps relative paths; any import that leaves the addon uses `@/...`.
- **Linter:** Native oxlint `import/extensions` rule (no JS plugin compatibility needed — oxlint has it). Pair with `no-restricted-imports` to ban `../../` patterns (always cross-boundary in this layout). Single `../` lives or dies on PR review since enforcement requires file-path-aware logic the linter doesn't express cleanly.
- **TS config:** Already `moduleResolution: "bundler"` — `.js` extensions are decorative, not required by the resolver. Removing them is safe for tsdown (bundler), tsx (esbuild), and vitest (vite).

## Scope

- `packages/cli/src/**/*.{ts,tsx}` — 285 `.js` matches in 100+ files, 79 files with cross-folder relatives, 41 files with `../../` or deeper.
- Static imports (`import x from '...'`), type imports (`import type x from '...'`), dynamic imports (`import('...')`, `await import('...')`), and `typeof import('...')` in generic positions (vi.importActual, importOriginal).

## Out of scope

- The vitest config `"sireno-deck-cli"` alias — unrelated.
- Reformatting unrelated code.
- Migrating builtin-addons content (none exists at workspace root — `builtin-addons/` lives inside `packages/cli/src/`).

## must_haves

```yaml
truths:
  - No `.js` extension remains on any relative import in `packages/cli/src/**/*.{ts,tsx}` (static, dynamic, or type-only).
  - `pnpm lint` fails fast if anyone reintroduces a `.js`-extension relative import.
  - `pnpm lint` fails fast if anyone introduces `../../` or deeper.
  - All cross-first-level-folder imports use `@/...`. Within-folder and within-addon imports stay relative.
  - `pnpm test` passes (vitest already maps `@` → `src/`).
  - `pnpm build` passes (tsdown unbundled output still resolves correctly).

artifacts:
  - .oxlintrc.json at workspace root (with `import` plugin enabled and the two rules wired)
  - All TS/TSX import statements in `packages/cli/src/` rewritten

key_links:
  - packages/cli/tsconfig.json (already has `@/*` → `./src/*`)
  - packages/cli/vitest.config.ts (already aliases `@` → `./src`)
  - tsconfig.json at root (already has `@/*` → `./packages/cli/src/*`)
```

---

## Task 1 — Wire oxlint config that bans `.js` and deep relatives

<files>
- .oxlintrc.json (new, at workspace root)
</files>

<action>
Create `.oxlintrc.json` at the workspace root with:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["import"],
  "rules": {
    "import/extensions": ["error", "never", { "ignorePackages": true }],
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../../*", "../../../*", "../../../../*"],
            "message": "Cross-folder imports must use the @/ alias (see AGENTS.md import conventions)."
          }
        ]
      }
    ]
  }
}
```

Confirm `oxlint packages/` from the workspace root picks the config up (oxlint walks up looking for `.oxlintrc.json`). Run `pnpm lint` once to capture current violation count — this is the baseline that Task 2 must drive to zero.
</action>

<verify>
- `pnpm lint` runs without an "unknown rule" or "plugin not found" error.
- Output shows violations against existing files (proves rules are active).
- Record the violation count in the task's commit message.
</verify>

<done>
- `.oxlintrc.json` exists at workspace root and is parsed by oxlint.
- `pnpm lint` reports `import/extensions` and `no-restricted-imports` violations against current code.
- Commit: `chore(quick-039): configure oxlint to ban .js imports and deep relatives`
</done>

---

## Task 2 — Codemod: strip `.js` and rewrite to `@/...` per loose rule

<files>
- scripts/quick-039-rewrite-imports.mjs (new, throwaway codemod kept in repo for audit)
- packages/cli/src/**/*.{ts,tsx} (rewritten by codemod)
</files>

<action>
Write `scripts/quick-039-rewrite-imports.mjs` — a self-contained Node script using only stdlib. Walk every `.ts`/`.tsx` under `packages/cli/src/`. For each file, find every import specifier in:

1. Static: `import ... from '<spec>'` / `import '<spec>'`
2. Re-export: `export ... from '<spec>'`
3. Dynamic: `import('<spec>')` / `await import('<spec>')`
4. Type-only generic position: `typeof import('<spec>')` (covers `vi.importActual`, `importOriginal`)

For each relative specifier (`./...` or `../...`):

**Step A — strip extension:** drop a trailing `.js`, `.jsx`, `.ts`, or `.tsx`. (Keep file-extension-bearing assets like `.json`, `.css`, `.svg`, etc. — they're not module imports of TS/JS source.)

**Step B — rewrite to alias when cross-boundary:**
1. Resolve the specifier against the file's directory → absolute target path.
2. Compute `firstLevel(filePath)` = first segment under `packages/cli/src/`. Compute `firstLevel(targetPath)` likewise.
3. If `firstLevel(file) === firstLevel(target)`:
   - If `firstLevel === 'builtin-addons'`, additionally check the addon segment (second segment). If both files share the same addon, keep relative. Otherwise rewrite to `@/...`.
   - Otherwise keep relative.
4. Else: rewrite to `@/<path-relative-to-src>`.

For each rewrite, normalize to POSIX separators in the specifier.

Leave bare specifiers (`react`, `pino`, `@elgato-stream-deck/node`) untouched. Leave the `sireno-deck-cli` alias untouched.

After the script runs:
- Print a summary: files touched, `.js` extensions stripped, specifiers rewritten to `@/...`, specifiers left relative.

Run it: `node scripts/quick-039-rewrite-imports.mjs`
</action>

<verify>
- `rg "from ['\"]\\.[^'\"]*\\.js['\"]" packages/cli/src` returns zero matches.
- `rg "import\\(['\"]\\.[^'\"]*\\.js['\"]" packages/cli/src` returns zero matches.
- `rg "from ['\"](\\.\\./){2,}" packages/cli/src` returns zero matches.
- `pnpm lint` passes with zero `import/extensions` or `no-restricted-imports` violations.
- `pnpm test` passes (all vitest suites green — they use the `@` alias from vitest.config.ts).
- `pnpm build` passes (tsdown produces dist/ for cli + index entries).
- Spot-check 3 files across different src folders to confirm correctness of rewrites (one same-folder, one cross-folder, one same-addon).
</verify>

<done>
- All four `rg` checks return zero matches.
- `pnpm lint && pnpm test && pnpm build` exits 0.
- `scripts/quick-039-rewrite-imports.mjs` committed for posterity.
- Commit: `refactor(quick-039): drop .js import extensions and adopt @ alias for cross-folder imports`
</done>

---

## Task 3 — Document the convention in AGENTS.md

<files>
- AGENTS.md
</files>

<action>
Add a short "Import conventions" subsection under "Conventions → Code Style" (or extend the existing bullets). Capture:

- No `.js` extensions on TS/TSX-to-TS/TSX imports. The `bundler` resolver handles it.
- Use `@/...` (= `packages/cli/src/...`) whenever crossing a first-level `src/` folder. Within the same first-level folder, or within the same addon (`src/builtin-addons/<name>/`), keep relative imports.
- `oxlint` enforces these via `import/extensions` and `no-restricted-imports`.

Keep it under 8 lines — it's a quick rule reminder, not a tutorial.
</action>

<verify>
- AGENTS.md contains the new bullets and they read accurately against the actual oxlint config.
</verify>

<done>
- AGENTS.md updated.
- Commit: `docs(quick-039): document .js-less imports and @ alias convention`
</done>
