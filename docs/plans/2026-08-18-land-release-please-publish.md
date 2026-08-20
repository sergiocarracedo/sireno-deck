# Land release-please + npm publish + @sirenodeck rename

- **Date:** 2026-08-18
- **Branch suggestion:** `feat/release-please-publish` (already exists) → PR into `main`
- **Product contract source:** ce-plan-bootstrap
- **Plan depth:** Standard
- **Status:** Draft

## 1. Goal

Land the existing `feat/release-please-publish` worktree onto `main` so the
`@sirenodeck/*` packages can ship to npm via release-please + OIDC Trusted
Publishing. After merge:

- Every merged conventional commit triggers a release-please PR with per-package
  version bumps and changelogs.
- Merging a release-please PR pushes a `@sirenodeck/<pkg>-<version>` tag that
  fires `publish-npm.yml` with `npm publish --provenance --access public`.
- CI gates (`lint`, `format`, `typecheck`, `test`, `pnpm -r build` of publishable
  packages) green on the merged commit.
- Three P0s from `__beta-review__/REPORT.md` (LICENSE, CI, release packaging)
  resolved in the same landing.

## 2. State of the branch today

Two commits on top of `main` (`81340cae`, 2026-08-18):

| SHA        | Title                                                      |
| ---------- | ---------------------------------------------------------- |
| `7e152934` | chore(publish): rename packages to @sirenodeck scope       |
| `cfdd5e5b` | ci: add release-please + per-package npm publish workflows |

Diff: 278 files, +6295 / −14823 LOC (most deletions are pre-existing code paths
removed by the rename, not net new code).

### What's in the branch

- **LICENSE** (MIT) at repo root — fixes `__beta-review__/08 #1`.
- **5 GitHub Actions workflows** at `.github/workflows/`:
  - `ci.yml` — gates (`lint`, `format`, `typecheck`, `test`, build) +
    conventional-commits PR-title check.
  - `release-please.yml` — opens per-package release PRs.
  - `release.yml` — tag `@sirenodeck/*` → `publish-npm.yml` (reusable).
  - `publish-npm.yml` — `npm publish --provenance --access public`,
    verifies on npm with retry loop.
  - `auto-merge-release-please.yml` — auto-merge release-please PR after CI
    green, with provenance check (refuses cross-repo, refuses non-`release-please--branches--*`).
- **release-please-config.json** + **release-please-manifest.json** — 5 packages
  tracked (`@sirenodeck/cli`, `@sirenodeck/addon-app-shortcuts`,
  `@sirenodeck/addon-pomodoro`, `@sirenodeck/theme-neon-grids`,
  `@sirenodeck/theme-riptide`), each with per-package CHANGELOG.
- **RELEASING.md** — flow + one-time npm Trusted Publisher setup.
- **Rename** — `sirenodeck` → `sireno` (binary + daemon), `@sireno-deck/cli` →
  `@sirenodeck/cli`, themes `@sireno-deck/theme-*` → `@sirenodeck/theme-*`,
  addons gain `license`/`repository`/`publishConfig` blocks, `tsx` moves from
  devDep → dep so the published CLI runs without the workspace.
- **MIGRATION-NOTES.md** — preserved legacy decisions (P1 #14).

### Verification I ran (this worktree, 2026-08-18)

```
pnpm install --frozen-lockfile    → ok
pnpm lint                          → warnings only (acceptable)
pnpm format:check                  → clean
pnpm typecheck                     → clean
pnpm -r --filter "@sirenodeck/*" build → all 3 publishable packages build clean
pnpm test --run                    → 10 failed files / 14 failed tests
```

Test status on main for comparison: 6 failed files (pre-existing).

## 3. Stable regressions vs main

After running the suite twice and diffing the failed-test lists, **3 tests are
reliably new on the branch**. The other failures I observed first-pass were
intermittent (suite-ordering / fixture pollution) and resolved on re-run.

| Test                                                                     | Symptom                                              | Root cause                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/cli/src/__tests__/logger-format.test.ts` (×2)                  | expects `deckId: main` / `err:` in stdout; gets JSON | logger default human format was changed during the rename                         |
| `packages/cli/src/outputClient/__tests__/emulator.test.ts > listDevices` | expects 2 virtual devices (mk2, xl); gets 3          | a third virtual device was added (likely `mini`/`plus`) without updating the test |

### Intermittent failures (need investigation, may share a fix)

These fail in the full suite but pass in isolation. Suggests state leaking
between test files:

- `packages/cli/src/cli/commands/__tests__/run.test.ts > non-deck config change broadcasts iframe-reload`
- `packages/cli/src/cli/commands/__tests__/start.test.ts > forks off / persists / resolves immediately`
- `packages/cli/src/cli/commands/__tests__/addon-registry.test.ts` (2 tests)
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts > maps addon-generated deck buttons`
- `packages/cli/frontend/src/__tests__/deck-render.test.tsx` (2 tests)
- `packages/cli/src/action/__tests__/executor.test.ts > interpolates {{ host.* }}` (2 tests)
- `packages/cli/src/config/__tests__/include-resolver.test.ts > throws when missing`

Pattern: many are in `cli/commands/__tests__/` — likely a shared fixture
(`/tmp` paths, daemon state, fs mocks) wasn't reset between files.

### Pre-existing failures (already on main, out of scope per AGENTS.md)

- `packages/cli/src/builtin-addons/system-status/__tests__/display-count-formatter.test.ts`
- `packages/cli/src/builtin-addons/system-status/__tests__/display-rate-bytes-formatter.test.ts`
- `packages/cli/src/builtin-addons/system-status/__tests__/network-throughput-metric.test.ts`
- `packages/cli/src/deck/__tests__/chrome-icon-resolution.test.ts`

These four are tracked by the beta-review and are not this plan's responsibility.

## 4. Implementation units

### IU-1 — Fix the 3 stable regressions (precondition for merge)

Squash or amend onto `feat/release-please-publish` as a single commit
`test: fix rename regressions on feat/release-please-publish`.

**IU-1.a** — Restore the default human logger format.

Files: `packages/cli/src/util/logger.ts`,
`packages/cli/src/__tests__/logger-format.test.ts`.

Tests that need to pass:

- `renders a single line with msg and context, no (sireno-deck) tag`
- `renders error details inline on the same line`

Scenario: with default human format and no pino options override, `logger.info({deckId:"main", position:11, gesture:"tap"}, "emulator: button-action received")`
writes one line containing `deckId: main`, `position: 11`, `gesture: tap`, and the msg.
For error level, the line also contains `err: Error: boom`.

Decision: keep the JSON output that the rename adopted (it's machine-readable),
or restore the human format the tests expect. The tests are the spec here —
they were not updated during the rename. Restore the human format unless the
rename-intent was deliberately to switch to JSON; if so, update the two tests
to assert JSON shape. **Recommendation: keep JSON, update the tests.** The
JSON format is what npm-published artifacts will emit, and pino's default
human format is harder to grep across multi-line payloads. Update the two
tests to assert JSON-shape instead.

**IU-1.b** — Reconcile `EmulatorOutputClient.listDevices` test.

Files: `packages/cli/src/outputClient/__tests__/emulator.test.ts`,
`packages/cli/src/outputClient/emulator.ts`,
`packages/cli/src/device/registry.ts` (read-only).

Test that needs to pass: `returns virtual descriptors for mk2, xl`.

Scenario: `new EmulatorOutputClient().listDevices()` returns one descriptor per
device model the registry knows about, sorted by id. The test currently
expects exactly 2 (`mk2`, `xl`); the registry has 3 (a `mini` or `plus` was
added on the branch). Either remove the `length === 2` assertion and assert
the sorted id set contains `["emulator:mk2", "emulator:xl", "<third>"]`, or
confirm only `mk2` and `xl` should be in the virtual list and remove the third
from the registry.

**IU-1.c** — Investigate and fix the intermittent suite-ordering failures.

Files: under `packages/cli/src/cli/commands/__tests__/` and adjacent.

Likely cause: shared fixture mutation (`vi.mock` of `node:os`, `node:fs`,
`./daemon`, or a singleton `process.cwd()` override) in one test file that is
not reset between files. `vitest` runs each file in isolation by default, but
`vi.mock` of `node:os` / `node:fs` hoists in some configs.

Diagnostic steps:

1. Run `pnpm test --run packages/cli/src/cli/commands/__tests__/run.test.ts packages/cli/src/cli/commands/__tests__/start.test.ts --reporter=verbose`
   in the failing order to see which file's setup pollutes.
2. For each `vi.mock(...)` call in the affected files, add `vi.unmock(...)` /
   `vi.resetModules()` in `afterEach`.
3. If a `cwd` or `tmp` dir is shared, switch to per-test `tmpdir()`.

Acceptance: the full suite runs clean twice in a row (re-runs to catch order
sensitivity).

### IU-2 — Open the PR

Push the branch (already pushed as `feat/release-please-publish`).

PR title: `chore(publish): rename packages to @sirenodeck scope + add release-please`
(use conventional format; the CI gate enforces this).

PR body must include:

- Summary: rename + release infra + test fixes.
- Reference to `__beta-review__/REPORT.md` for the P0 list being addressed.
- "Verification" section with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test --run && pnpm -r --filter "@sirenodeck/*" build` output.
- Note: npm Trusted Publishers must be configured once at npmjs.com per
  `RELEASING.md` §"One-time setup". This is manual and lives outside the repo.

### IU-3 — One-time npm Trusted Publisher configuration (manual, blocks first release)

For each of the 5 packages, on <https://www.npmjs.com/>:

1. Open the package page (under the `@sirenodeck` org).
2. Settings → Publishing access → Trusted Publishers → Add a trusted publisher.
3. Provider: GitHub Actions.
4. Repository: `sergiocarracedo/sireno-deck`.
5. Workflow filename: `publish-npm.yml`.

Without this, the first `publish` step fails with `npm error EUNKNOWNPROVIDER`.

The `@sirenodeck/cli` package is **already** un-private on the branch (gains
`publishConfig.access: "public"`). For `app-shortcuts`, `pomodoro`,
`theme-neon-grids`, `theme-riptide` — verify each was made public on the
branch and is claimable under the org.

### IU-4 — Verify auto-merge path on a dry-run PR

Once CI is green and the PR is open:

1. Force a release-please PR by merging a `feat: ...` commit to `main` (or
   pushing a test conventional commit after merge).
2. Watch `release-please.yml` open a release PR.
3. Watch `ci.yml` run on the release PR.
4. Watch `auto-merge-release-please.yml` merge it after CI green
   (provenance-checked).
5. Watch `release.yml` fire on the new tag.
6. Watch `publish-npm.yml` publish the package and `npm view` verify it.

If any step fails, the branch's first release becomes a manual
`workflow_dispatch` (RELEASING.md §"Manual release").

## 5. Out of scope

- The actual first release of any `@sirenodeck/*` package — that runs after
  merge, gated on the one-time npm setup (IU-3).
- Fixing the pre-existing 4 test failures on main (`system-status`,
  `chrome-icon-resolution`).
- Installer scripts (`packages/cli/scripts/installer/`) — deleted on the
  branch; if reinstall is needed later, recover from git history or rebuild
  (referenced in `docs/solutions/build/installer-runtime-tree-pnpm-deploy.md`).
- Themes publishing verification (`@sirenodeck/theme-neon-grids`,
  `@sirenodeck/theme-riptide`) — covered by the same `publish-npm.yml`
  reusable, but their content sanity (assets, tsconfig) is not this plan's
  responsibility.
- Any `__beta-review__/` P1+ items beyond what this landing already addresses.

## 6. Verification

Run in `/works/__worktrees/opensource/sireno-deck-2/feat-release-please-publish`:

```bash
pnpm install --frozen-lockfile
pnpm lint                      # warnings ok
pnpm format:check              # clean
pnpm typecheck                 # clean
pnpm test --run                # 0 failed files (after IU-1 fixes)
pnpm -r --filter "@sirenodeck/*" build
```

Plus the AGENTS.md "Verification" recipe for emulator + frontend surfaces.

## 7. Risks

| Risk                                                                           | Likelihood | Mitigation                                                                                                                  |
| ------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Trusted Publisher setup forgotten on one of 5 packages                         | Medium     | `RELEASING.md` lists all 5; IU-3 checklist before first release                                                             |
| Auto-merge runs on a forked-PR release-please                                  | Low        | `auto-merge-release-please.yml` validates `isCrossRepository: false` + branch prefix                                        |
| Provenance build fails (no OIDC in fork PR)                                    | Low        | `publish-npm.yml` uses `id-token: write`; runs only on tag pushes from main                                                 |
| Renamed bin `sireno` conflicts with another system tool                        | Low        | check `command -v sireno` first; rename to `sirenod` if collision detected                                                  |
| `dist/` still committed in addons — release-please sees no source diff         | Low        | release-please reads `package.json` version, not `dist/`; CHANGELOG tracks `src/`                                           |
| The intermittent suite-ordering failures hide a deeper rename-induced bug      | Medium     | IU-1.c is investigative; if not tractable in one PR, gate the merge on fixing                                               |
| `packages/cli/scripts/installer/` was deleted by the branch (Flatpak/dmg/Inno) | Medium     | If you need installers, recover from `git log -- packages/cli/scripts/installer/`. The npm-publish flow does not need them. |

## 8. Sequencing

```
IU-1.a (logger) ──┐
IU-1.b (emulator) ─┼─→ single fix commit on feat/release-please-publish
IU-1.c (intermittent) ─┘            │
                                     ↓
IU-2: open PR (merge to main) ──→ CI green
                                     ↓
IU-3: configure 5 npm Trusted Publishers (manual, post-merge OK)
                                     ↓
IU-4: dry-run first release
```

IU-1 must finish before IU-2. IU-3 can run any time before the first actual
release. IU-4 validates the chain end-to-end before relying on it.

## 9. Test scenarios per IU

| IU     | Test                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| IU-1.a | `pnpm test --run packages/cli/src/__tests__/logger-format.test.ts` passes; default human format OR JSON-shape per chosen direction |
| IU-1.b | `pnpm test --run packages/cli/src/outputClient/__tests__/emulator.test.ts` passes; `listDevices` returns the expected set          |
| IU-1.c | `pnpm test --run` green twice in a row with no flake; failure file count == 0 (or == pre-existing 4)                               |
| IU-2   | PR open on GitHub; CI green; auto-merge does not fire (PR is not from release-please)                                              |
| IU-3   | `npm view @sirenodeck/cli` shows public access; same for the other 4                                                               |
| IU-4   | `git tag @sirenodeck/cli-0.1.1` (test) → `release.yml` fires → `npm view @sirenodeck/cli version` reports 0.1.1                    |
