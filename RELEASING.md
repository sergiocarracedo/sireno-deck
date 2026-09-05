# Releasing

Sireno Deck uses [release-please](https://github.com/googleapis/release-please) to
bump versions in a manually requested release PR, then GitHub Actions + npm
Trusted Publishing ship each changed package to npm.

## Packages

Five packages live under the [`@sirenodeck`](https://www.npmjs.com/org/sirenodeck)
organization. Each one tracks its own version and ships independently. A
manual Release Please run can combine selected packages into one release PR.

| Package                           | Path                            | Builds before publish? |
| --------------------------------- | ------------------------------- | ---------------------- |
| `@sirenodeck/cli`                 | `packages/cli`                  | Yes (tsdown)           |
| `@sirenodeck/addon-app-shortcuts` | `packages/addons/app-shortcuts` | Yes                    |
| `@sirenodeck/addon-pomodoro`      | `packages/addons/pomodoro`      | Yes                    |
| `@sirenodeck/theme-neon-grids`    | `packages/themes/neon-grids`    | No                     |
| `@sirenodeck/theme-riptide`       | `packages/themes/riptide`       | No                     |

Private (not published): `sirenodeck-workspace` (root), `sirenodeck-web`,
`sirenodeck-videos`, `@sirenodeck/docs`.

### `@sirenodeck/cli` build & runtime

The CLI is bundled via `tsdown` into a single ESM file at `dist/main.mjs`. The
`bin/sirenodeck.js` wrapper spawns the bundle with `process.execPath`. Native
deps (`sharp`, `@elgato-stream-deck/node`, `dbus-next`, `get-windows`,
`usocket`, `@julusian/jpeg-turbo`) are kept external — they ship prebuilt
`.node` binaries that a JS bundle cannot embed.

Real-mode rendering (Playwright headless screenshots of the frontend SPA)
expects a pre-built `frontend/dist/`. The vite frontend build emits an empty
stub due to a pre-existing config issue (`assetsInclude: ["**/*.html"]` in
`frontend/vite.config.ts`). To enable real mode on a published install:

```sh
# After npm install -g @sirenodeck/cli
git clone https://github.com/sergiocarracedo/sireno-deck.git
cd sireno-deck/packages/cli
pnpm install
pnpm run build:frontend build:emulator   # vite build, fixed-config TBD
# Then point the daemon at the local clone, or run from source.
```

Emulator-mode and the daemon CLI commands (`start`, `stop`, `status`, `logs`)
work without the frontend bundle.

## Flow

```
push to main
  ├─ CI                lint · format · typecheck · test
  └─ website           deploys to GitHub Pages

Actions → release-please → Run workflow
  ├─ select CLI/web, and/or any addons/themes
  └─ release-please    opens one release PR for the selected packages
merge release PR       manually, after reviewing the version bumps/changelog
  ├─ tag pushed        e.g. @sirenodeck/cli-0.1.1
  └─ release           publishes each tagged package independently
                        └─ publish-npm    npm publish --provenance --access public
```

`main` is the staging branch. It is safe to push there without publishing a new
package version. The website still deploys from every relevant `main` push.

The CLI/web selection releases the CLI package; the website itself is private
and has no npm version. Multiple addons and themes can be selected in the same
workflow run and are combined into one release PR. Packages with no releasable
changes are omitted.

## One-time setup (npm Trusted Publishing)

For each of the five packages listed above, the npm Trusted Publisher must be
configured once at <https://www.npmjs.com/>:

1. Open the package page (under the `@sirenodeck` org).
2. **Settings → Publishing access → Trusted Publishers → Add a trusted publisher.**
3. Provider: **GitHub Actions**.
4. Repository: `sergiocarracedo/sireno-deck`.
5. Workflow filename: `publish-npm.yml`.

This enables `npm publish --provenance` via OIDC — no `NPM_TOKEN` secret to
manage or leak. If any package is missing this configuration, the
`publish` step will fail with `npm error EUNKNOWNPROVIDER` and link to the
setup page.

## Daily workflow

Merge PRs with [Conventional Commit](https://www.conventionalcommits.org/)
titles. CI and the website deployment run from `main`; npm publishing only
happens after a manually requested release PR is merged.

If a release PR is sitting open with `0 packages changed`, your commits since
the last tag don't include any changes that release-please recognizes (no
`feat`, `fix`, `perf`, or `revert` after a 0.x bump). Use `chore` and `docs`
freely — they don't trigger bumps but still appear in the changelog.

## Creating a release

1. Open **Actions → release-please → Run workflow**.
2. Select `CLI/web` and/or any addons and themes to release.
3. Review the generated release PR and merge it manually.
4. The resulting package tags trigger npm publishing automatically.

Do not edit package versions manually. The release PR owns version bumps,
changelogs, and the manifest update.

## Homebrew tap

CLI releases automatically update `sergiocarracedo/homebrew-tap` with a
formula sourced from the published npm tarball. Configure a fine-grained
`HOMEBREW_TAP_TOKEN` secret with Contents write access to that repository.
Users install it with:

```sh
brew install sergiocarracedo/tap/sirenodeck
```

## Adding a new package

1. Create the package under the matching `packages/*` directory with a
   `package.json` whose `name` starts with `@sirenodeck/`.
2. Add the entry to [`release-please-config.json`](release-please-config.json).
3. Add the matching entry to [`release-please-manifest.json`](release-please-manifest.json)
   at the current version (often `0.1.0`).
4. Add the package selection input to
   [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml)
   and its path mapping.
5. Add the tag pattern to [`.github/workflows/release.yml`](.github/workflows/release.yml)
   (`detect` job) so the right package path and `needs-build` flag are picked.
6. Claim the npm name under `@sirenodeck` and configure the Trusted Publisher.
