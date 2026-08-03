# Releasing

Sireno Deck uses [release-please](https://github.com/googleapis/release-please) to
bump versions and open release PRs, then GitHub Actions + npm Trusted Publishing
to ship each package to npm.

## Packages

Five packages live under the [`@sirenodeck`](https://www.npmjs.com/org/sirenodeck)
organization. Each one tracks its own version and ships independently.

| Package                           | Path                            | Builds before publish? |
| --------------------------------- | ------------------------------- | ---------------------- |
| `@sirenodeck/cli`                 | `packages/cli`                  | No                     |
| `@sirenodeck/addon-app-shortcuts` | `packages/addons/app-shortcuts` | Yes                    |
| `@sirenodeck/addon-pomodoro`      | `packages/addons/pomodoro`      | Yes                    |
| `@sirenodeck/theme-neon-grids`    | `packages/themes/neon-grids`    | No                     |
| `@sirenodeck/theme-riptide`       | `packages/themes/riptide`       | No                     |

Private (not published): `sirenodeck-workspace` (root), `sirenodeck-web`,
`sirenodeck-videos`, `@sireno-deck/docs`.

## Flow

```
push to main
  └─ CI                lint · format · typecheck · test · build
  └─ release-please    opens/updates release PR with per-package version bumps
merge release PR       conventional-commits title required for auto-merge
  └─ tag pushed        e.g. @sirenodeck/cli-0.1.1
  └─ release           detects package from tag → calls publish-npm
                        └─ publish-npm    npm publish --provenance --access public
```

Release-please's auto-merge job watches the release PR's CI run and merges it
once green, but only if the PR originates from this repo's release-please bot.
See [`.github/workflows/auto-merge-release-please.yml`](.github/workflows/auto-merge-release-please.yml).

## One-time setup (npm Trusted Publishing)

For each package listed above, the npm Trusted Publisher must be configured
once at <https://www.npmjs.com/>:

1. Open the package page (under the `@sirenodeck` org).
2. **Settings → Publishing access → Trusted Publishers → Add a trusted publisher.**
3. Provider: **GitHub Actions**.
4. Repository: `sergiocarracedo/sireno-deck`.
5. Workflow filename: `publish-npm.yml`.

This enables `npm publish --provenance` via OIDC — no `NPM_TOKEN` secret to
manage or leak. If any of the five packages is missing this configuration, the
`publish` step will fail with `npm error EUNKNOWNPROVIDER` and link to the
setup page.

## Daily workflow

Nothing. Just merge PRs with [Conventional Commit](https://www.conventionalcommits.org/)
titles. Release-please reads the merged commits, figures out which packages
changed, bumps the version, opens a release PR, and (after CI green) auto-merges
it. Tags and npm publishes happen automatically.

If a release PR is sitting open with `0 packages changed`, your commits since
the last tag don't include any changes that release-please recognizes (no
`feat`, `fix`, `perf`, or `revert` after a 0.x bump). Use `chore` and `docs`
freely — they don't trigger bumps but still appear in the changelog.

## Manual release

For an out-of-band release (e.g. recovery from a failed auto-merge):

1. Edit the version in the relevant `package.json`.
2. Run the **Publish to npm** workflow via **Actions → publish-npm →
   Run workflow**, providing the package name and path.

## Adding a new package

1. Create the package under the matching `packages/*` directory with a
   `package.json` whose `name` starts with `@sirenodeck/`.
2. Add the entry to [`release-please-config.json`](release-please-config.json).
3. Add the matching entry to [`release-please-manifest.json`](release-please-manifest.json)
   at the current version (often `0.1.0`).
4. Add the tag pattern to [`.github/workflows/release.yml`](.github/workflows/release.yml)
   (`detect` job) so the right package path and `needs-build` flag are picked.
5. Claim the npm name under `@sirenodeck` and configure the Trusted Publisher.
