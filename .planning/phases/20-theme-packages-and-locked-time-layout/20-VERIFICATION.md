---
phase: 20
status: human_needed
verified: 2026-05-24
---

# Phase 20: Theme Packages, Asset Bundling, and Locked Time Layout — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 20-01 | Theme resolution accepts package-or-path strings and loads manifest-backed runtime entries | ✓ |
| 20-01 | Browser host uses the theme-owned `buttonFrame` seam for non-`full_surface` buttons | ✓ |
| 20-02 | Theme and addon assets resolve through one package-root-aware registry path | ✓ |
| 20-02 | Packaged theme CSS/font assets inject into the browser host with rewritten relative `url(...)` paths | ✓ |
| 20-02 | Shared asset proof fixture exists for theme and addon assets on the browser path | ✓ |
| 20-03 | Centered implicit locked fallback replaces the old single-button lock surface | ✓ |
| 20-04 | Browser-consumed config/addon image refs normalize into browser-loadable asset URLs before reaching the DOM host | ✓ |
| 20-05 | Real browser-renderer capture path loads shared local image assets through the shipped screenshot seam instead of degrading into broken placeholders | ✓ |
| 20-06 | Builtin/addon asset registrations keep each addon's own `assets/` directory in the resolved filesystem path before browser rendering begins | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| SCS-08 | Explicit locked-deck authority preserved while implicit fallback remains core-owned | ✓ |
| SCS-09 | Tests and fixtures cover the new theme package, asset pipeline, and locked-session behavior | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/cli/commands/start.ts -> resolveTheme` | `packages/cli/src/config/theme.ts` exports `resolveTheme` | ✓ |
| `packages/cli/src/render/dom-host.tsx -> theme.buttonFrame` | resolved theme object exposes `buttonFrame` | ✓ |
| `packages/cli/src/core/schemas.ts -> registry.requireAssetPath` | `packages/cli/src/addon/registry.ts` exposes `requireAssetPath` | ✓ |
| `packages/cli/src/deck/runtime.ts -> locked-time-tile` | `packages/cli/src/builtin-addons/date-time/index.ts` exposes the implicit locked fallback tile definition | ✓ |
| `packages/cli/src/core/schemas.ts -> setDomAssetPathResolver/createDomIcon` | browser image refs resolve to browser-loadable URLs through `packages/cli/src/addon/api.ts` | ✓ |
| `packages/cli/src/cli/commands/start.ts -> createBrowserRenderer` | the shipped browser/device path now captures deck HTML through the file-backed browser renderer seam in `packages/cli/src/render/browser-renderer.ts` | ✓ |
| `packages/cli/src/builtin-addons/core-buttons/index.ts` / `emoji-selector/index.ts` -> addon registry` | built-in shipped asset maps now resolve inside each addon's own `assets/` directory | ✓ |

## Summary

**Score:** 10/10 must-haves verified

Automated checks now pass across theme package loading, shared asset resolution, the centered implicit locked `HH:MM` fallback, URL normalization, the real browser-renderer capture seam, and the newly corrected built-in addon asset registration paths. The remaining work is one more human rerun of Fixture 2 on the shipped browser/device path to confirm the corrected addon-local asset registrations now render the images instead of the square plus broken-image indicator.

## Verification Performed In This Session

- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/render/dom-host.test.tsx src/render/button-frame.test.tsx src/builtin-addons/core-buttons/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/addon/registry.test.ts src/addon/loader.test.ts src/config/loader.test.ts src/builtin-addons/emoji-selector/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/builtin-addons/date-time/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/render/dom-host.test.tsx src/render/button-frame.test.tsx src/builtin-addons/core-buttons/index.test.ts src/addon/registry.test.ts src/addon/loader.test.ts src/config/loader.test.ts src/builtin-addons/emoji-selector/index.test.ts src/deck/runtime.test.ts src/builtin-addons/date-time/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/browser-renderer.test.ts src/render/dom-host.test.tsx src/config/loader.test.ts src/builtin-addons/emoji-selector/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/addon/registry.test.ts src/config/loader.test.ts src/builtin-addons/emoji-selector/index.test.ts`
- `packages/cli/fixtures/phase-20/config.theme-package-frame.yml` remains the committed browser/device review path for theme-owned frame chrome.
- `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` remains the committed browser/device review path for shared theme/addon assets.
- `packages/cli/fixtures/phase-20/config.locked-time-layout.yml` now provides the committed review path for the implicit centered `HH:MM` lock fallback, including unlock restore expectations and the rule that explicit `session.locked_deck` still wins.
- `20-04-PLAN.md` and `20-04-SUMMARY.md` fixed the HTML-side URL normalization seam, but that proof was insufficient for the shipped browser/device capture path.
- `20-05-PLAN.md` now pins the real browser-renderer seam with `src/render/browser-renderer.test.ts` and moves the capture path onto a temporary file-backed page before screenshot capture.
- `20-06-PLAN.md` corrects the built-in addon asset declarations and adds focused coverage that asserts the addon folder segment is preserved in resolved asset paths.
- Human rerun outcome after `20-04`: **failed**. The shared asset fixture still showed a square and broken-image icon on the real browser/device path.
- Human rerun outcome after `20-05`: **failed**. The shared asset fixture still showed the square and broken-image icon, and the user reported that resolved asset paths are missing the addon folder segment.
- Human rerun outcome after `20-06`: **pending**. Re-run `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` on the shipped browser/device path.

## Why It Broke Before

- The old implicit lock surface was still a single bundled `date-time` button at position `0`, which no longer matched the Phase 20 locked-layout contract.
- The first Wave 3 patch shape was also too static: it could have rendered `HH:MM` once, but without deriving per-tile content at render time the fallback would freeze instead of staying live on the existing one-second cadence.
- The shared asset pipeline originally proved filename/path expansion and CSS asset rewriting, but not the real browser page origin used during screenshot capture. That let the real asset fixture degrade into broken placeholder squares even while focused tests stayed green.
- `page.setContent(...)` is not equivalent to loading a real `file://` document when local assets matter. The browser renderer needed a file-backed document seam, not another HTML-only normalization tweak.
- The built-in addon asset declarations were also lying about where their files live. If an addon registers `../assets/...` from inside `builtin-addons/<name>/index.ts`, the registry happily records a path outside the addon folder and every later layer will faithfully render the wrong file URL.

## What We Learned

- Passing focused tests is not enough when the plan includes a live-cadence promise; lock-surface tiles must derive current time at render time, not only when the implicit deck is created.
- Phase artifacts need to move together with the code. Adding the fixture, UAT script, verification note, and roadmap/state updates in one pass avoids another stale-status rerun.
- Shared asset verification must prove the real browser screenshot seam, not just that an asset filename or `file://` URL survived config expansion.
- Shared asset verification also needs to assert the registered filesystem path itself, not just that a resolver returned some `file://` URL.

### Human Verification Needed

| Item | Plan | What's needed |
|------|------|---------------|
| Manual rerun of the shipped asset fixture is still required | 20-06 | Automated verification now covers the corrected addon-local asset registrations, but the real browser/device UAT rerun for `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` still needs to be completed and recorded. |
