# Quick Task 014 Plan

---
files_modified:
  - packages/cli/src/themes/default/theme.css
  - packages/cli/src/config/theme.test.ts
  - packages/cli/src/render/dom-host.test.tsx
objective: "Restore the built-in default theme's bundled font stylesheet so theme resolution and DOM-host output once again expose real @font-face CSS for browser rendering."
must_haves:
  truths:
    - "resolveTheme(\"dark\") returns a non-empty stylesheet containing bundled @font-face rules with rewritten file:// asset URLs."
    - "renderDomDeck(..., { theme: await resolveTheme(\"dark\") }) includes the theme asset stylesheet in the rendered HTML."
    - "Focused theme and DOM-host vitest coverage passes."
  artifacts:
    - packages/cli/src/themes/default/theme.css
    - packages/cli/src/config/theme.test.ts
    - packages/cli/src/render/dom-host.test.tsx
  key_links:
    - "packages/cli/src/config/theme.ts loads packages/cli/src/themes/default/theme.css via manifest assets.styles"
    - "packages/cli/src/render/dom-host.tsx injects theme.stylesheets into the deck HTML"
---

## Tasks

<task id="014-01">
<title>Restore bundled default theme font stylesheet</title>
<files>
- packages/cli/src/themes/default/theme.css
</files>
<action>
Replace the empty default theme stylesheet with real CSS that declares bundled `@font-face` rules for the default theme typography assets already present under `packages/cli/src/themes/default/assets/`. Keep the change narrow: add only the IBM Plex Sans and IBM Plex Mono faces that the default theme manifest references through `typography`, and point each `src: url(...)` at relative asset paths so `resolveTheme()` can rewrite them to `file://` URLs.
</action>
<verify>
Read `packages/cli/src/themes/default/theme.css` and confirm it contains `@font-face`, `IBM Plex Sans`, `IBM Plex Mono`, and relative `url("./assets/...`) references.
</verify>
<done>
The default theme package once again ships a non-empty asset stylesheet that can supply bundled fonts to browser-rendered output.
</done>
</task>

<task id="014-02">
<title>Lock the restored stylesheet through focused tests</title>
<files>
- packages/cli/src/config/theme.test.ts
- packages/cli/src/render/dom-host.test.tsx
</files>
<action>
Strengthen the two failing tests only as needed to assert the restored default theme stylesheet is materially present. Keep their current intent, but add one concrete expectation per seam that proves the stylesheet contains the bundled IBM Plex font declarations instead of merely any `@font-face` token. Do not broaden scope beyond these focused theme/font checks.
</action>
<verify>
Run `pnpm exec vitest run packages/cli/src/config/theme.test.ts packages/cli/src/render/dom-host.test.tsx` from `packages/cli` and confirm both suites pass.
</verify>
<done>
Focused theme resolution and DOM-host tests both pass and explicitly guard the restored bundled-font stylesheet contract.
</done>
</task>
