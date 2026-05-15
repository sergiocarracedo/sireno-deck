---
files_modified:
  - packages/cli/fixtures/phase-7/README.md
  - packages/cli/fixtures/phase-7/config.shared-dark.yml
  - packages/cli/fixtures/phase-7/config.shared-light.yml
  - packages/cli/fixtures/phase-7/config.wrapper-contract.yml
  - packages/cli/fixtures/phase-7/phase-7-review-addon/package.json
  - packages/cli/fixtures/phase-7/phase-7-review-addon/src/index.js
  - .planning/phases/07-typography-text-behavior/07-UAT.md
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Add repo-pinned Phase 7 manual UAT configs so typography, clip behavior, and the optional shared wrapper contract can be checked from committed inputs instead of ad hoc setup."
must_haves:
  truths:
    - "`packages/cli/fixtures/phase-7/` exists with committed configs for dark-theme shared text, light-theme shared text, and addon-backed shared-wrapper verification."
    - "The Phase 7 UAT doc names exact `--config` inputs under `packages/cli/fixtures/phase-7/` for all three manual checks."
    - "Project state and changelog record that Phase 7 manual review now uses committed fixture inputs."
  artifacts:
    - packages/cli/fixtures/phase-7/README.md
    - packages/cli/fixtures/phase-7/config.shared-dark.yml
    - packages/cli/fixtures/phase-7/config.shared-light.yml
    - packages/cli/fixtures/phase-7/config.wrapper-contract.yml
    - packages/cli/fixtures/phase-7/phase-7-review-addon/src/index.js
    - .planning/phases/07-typography-text-behavior/07-UAT.md
    - CHANGELOG.md
    - .planning/STATE.md
  key_links:
    - "`packages/cli/fixtures/phase-7/config.wrapper-contract.yml` enables the committed local addon in `packages/cli/fixtures/phase-7/phase-7-review-addon/` so the Phase 7 wrapper check uses real addon-authored render output."
    - "`.planning/phases/07-typography-text-behavior/07-UAT.md` references the new Phase 7 fixture configs by exact path."
---

# Quick Task 013: Add UAT Review Config Fixtures

<objective>
Close the remaining manual-review setup gap for Phase 7. Keep it narrow: add committed fixture configs that make the typography and clip checks runnable from the repo, add the smallest real local addon fixture needed to exercise the optional shared wrapper contract, and point the UAT handoff at those exact inputs.
</objective>

## Tasks

<task id="013-01">
<title>Add repo-pinned Phase 7 fixture configs and addon-backed wrapper input</title>
<files>
- packages/cli/fixtures/phase-7/README.md
- packages/cli/fixtures/phase-7/config.shared-dark.yml
- packages/cli/fixtures/phase-7/config.shared-light.yml
- packages/cli/fixtures/phase-7/config.wrapper-contract.yml
- packages/cli/fixtures/phase-7/phase-7-review-addon/package.json
- packages/cli/fixtures/phase-7/phase-7-review-addon/src/index.js
</files>
<action>
Add a new `packages/cli/fixtures/phase-7/` fixture directory. Create one dark-theme config and one light-theme config that both use built-in button types so the first two UAT checks can compare theme-driven shared text and clip-only overflow from committed repo inputs. Also add the smallest real local addon fixture package that registers two button types: one button must render a `deck-button` with `wrapper: "shared"` and `overflow: "clip"`, and one button must render a bespoke `deck-button` without those props. Wire `config.wrapper-contract.yml` to enable that local addon so the optional-wrapper UAT step uses actual addon-authored output instead of a hypothetical config-only surface.
</action>
<verify>
grep -n "phase-7-review-addon\|wrapper: \"shared\"\|overflow: \"clip\"\|theme: light\|theme: dark" packages/cli/fixtures/phase-7/README.md packages/cli/fixtures/phase-7/*.yml packages/cli/fixtures/phase-7/phase-7-review-addon/src/index.js
</verify>
<done>
Phase 7 manual review has committed config inputs for the shared-text theme comparison and a committed local addon fixture for the shared-wrapper contract check.
</done>
</task>

<task id="013-02">
<title>Point Phase 7 UAT handoff and project tracking at the new fixtures</title>
<files>
- .planning/phases/07-typography-text-behavior/07-UAT.md
- CHANGELOG.md
- .planning/STATE.md
</files>
<action>
Update `07-UAT.md` so each pending Phase 7 check names the exact `packages/cli/fixtures/phase-7/*.yml` config to run with `--config`, including the light-vs-dark comparison and the addon-backed wrapper-contract check. Add a dated changelog entry that records the new UAT fixtures plus the root-cause learning that manual review drifts without committed inputs. Then update `.planning/STATE.md` to record quick task 013 in the quick-task table and refresh Last activity so the next manual review pass starts from the committed Phase 7 fixture set.
</action>
<verify>
grep -n "packages/cli/fixtures/phase-7\|013\|manual review" .planning/phases/07-typography-text-behavior/07-UAT.md CHANGELOG.md .planning/STATE.md
</verify>
<done>
The Phase 7 UAT handoff and project tracking point to the committed fixture inputs instead of relying on ad hoc local setup.
</done>
</task>
