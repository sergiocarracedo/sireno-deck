---
name: sirenodeck-extension-authoring
description: Create, test, package, and publish third-party Sireno Deck addons or themes in the creator's own repository, then prepare a registry submission issue. Use when building a Sireno Deck addon, custom theme, or submitting either to the community website registry.
---

# Author a Sireno Deck addon or theme

Create extensions in the user's own repository. Do not direct them to upload extension source into the Sireno Deck repository. First identify whether they want an addon, a theme, or both; consult current developer docs and source contracts before writing code.

## Shared workflow

1. Confirm the extension type, intended users, package/repository name, target OS/runtime assumptions, and license.
2. Read `packages/cli/docs/developer/addon-authoring.mdx` or `theme-authoring.mdx`, `packages/cli/src/addon/api.ts`, current manifests under `packages/cli/src/builtin-addons/` and `packages/addons/`, and current theme packages under `packages/themes/`. Prefer actual current API/types over stale documentation examples.
3. Build in the user's repo, run its checks, and verify rendering/use in the Sireno Deck emulator. Do not claim compatibility until tested.
4. Publish/source-control the work in the author's own public repository (and npm, if appropriate) before requesting website registry inclusion. The website registry is a curated listing; a GitHub issue requests review, it does not publish code or guarantee listing.

## Addon path

- Follow the current `AddonManifestV1`/`sirenodeck.json` contract. Namespace button and deck IDs with the addon's manifest name. Check config schemas, lifecycle/gesture behavior, frontend entry, and any global backend against current `packages/cli/src/addon/api.ts` and working addons.
- Include a clear description, license, installable npm package or reproducible local setup, and an emulator test path. Document configuration and platform/runtime dependencies.
- When ready, fill `.github/ISSUE_TEMPLATE/addon-submission.md` and ask before opening/submitting the issue. Include public repo URL, npm page if published, one-line description, use case/category, screenshot(s), button types and generated decks, install/config snippet, test steps, and license. Site maintainers assign registry-only fields such as official/community classification and ordering.

## Theme path

- Follow the current theme package/manifest schemas from `packages/cli/src/themes/` and a current theme in `packages/themes/`. Verify tokens, typography, font/assets licensing, and any CSS/UI overrides against the actual loader and theme docs.
- `packages/themes/folio` is a minimal, source-only manifest example and is not currently available on npm. Do not suggest `sirenodeck install @sirenodeck/theme-folio` as a working command. For source-only themes, use the absolute theme directory as the `theme:` value after cloning the repo.
- Test with the emulator and a representative deck/model before publishing.
- When ready, fill `.github/ISSUE_TEMPLATE/theme-submission.md` and ask before opening/submitting the issue. Include public repository or npm URL, one-line description, palette/tokens, optional typography roles, screenshot/preview, custom component overrides, license, and tested config snippet.

## Prepare, don't submit without consent

Use the repository's existing templates at:

- Addon: `https://github.com/sergiocarracedo/sireno-deck/issues/new?template=addon-submission.md`
- Theme: `https://github.com/sergiocarracedo/sireno-deck/issues/new?template=theme-submission.md`

Draft the issue body and preview URL for the user, check all links and required fields, and get explicit approval before opening or submitting it. If browser/GitHub access is unavailable, provide the completed template text and URL. Never claim registry inclusion has happened until maintainers add it to the website content collection.
