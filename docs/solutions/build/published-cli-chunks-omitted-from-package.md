---
title: Published CLI omitted generated bundle chunks
date: 2026-11-01
category: docs/solutions/build/
module: packages/cli
problem_type: runtime_error
component: release
severity: high
applies_when:
  - Bundling the CLI with tsdown and publishing its output as a package archive
  - Updating Homebrew from a release artifact
tags: [npm, homebrew, tsdown, release, code-splitting]
---

# Published CLI omitted generated bundle chunks

## Symptom

The installed CLI fails at startup with `Cannot find module .../dist/<chunk>.mjs`
imported from `dist/main.mjs`, even though the entry bundle exists.

## Cause

`tsdown` emits lazy-loaded ESM chunks beside `dist/main.mjs`. The CLI package's
`files` allowlist included only the entry file, so `npm pack` and Homebrew's
package archive omitted the generated chunks.

## Resolution

Include the complete `dist/` directory in package archives. During the
Homebrew release job, compare the generated `dist/` file list with the files in
the packed tarball before uploading it. The formula downloads that archive from
the GitHub Release, so the Homebrew update does not wait for npm package
publication to finish.

## Prevention

When a bundle emits dynamic-import chunks, validate the packed archive rather
than assuming that having the entrypoint in the package is sufficient. Keep
release artifact creation independent from registry publication when both
distribution channels need to proceed despite registry-side review delays.

## Related

- `packages/cli/tsdown.config.ts` — emits the CLI entry and lazy chunks.
- `packages/cli/package.json` — package `files` allowlist must include `dist/`.
- `.github/workflows/release.yml` — verifies the packed distribution and uploads
  the Homebrew archive to the GitHub Release.
