---
files_modified:
  - packages/cli/fixtures/phase-5/README.md
  - packages/cli/fixtures/phase-5/config.local-addon.yml
  - packages/cli/fixtures/phase-5/config.warning-isolation.yml
  - packages/cli/fixtures/phase-5/config.api-version-mismatch.yml
  - packages/cli/fixtures/phase-5/config.npm-addon.yml
  - packages/cli/fixtures/phase-5/local-clock-addon/package.json
  - packages/cli/fixtures/phase-5/local-clock-addon/src/index.js
  - packages/cli/fixtures/phase-5/broken-local-addon/package.json
  - packages/cli/fixtures/phase-5/broken-local-addon/src/index.js
  - packages/cli/fixtures/phase-5/version-mismatch-addon/package.json
  - packages/cli/fixtures/phase-5/version-mismatch-addon/src/index.js
  - packages/cli/fixtures/phase-5/community-addon/package.json
  - packages/cli/fixtures/phase-5/community-addon/src/index.js
  - .planning/phases/05-addon-system/05-UAT.md
  - .planning/phases/05-addon-system/05-VERIFICATION.md
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Add repo-pinned Phase 5 verification fixtures so manual addon startup checks use committed inputs instead of ad hoc local setup."
---

# Quick Task 010: Add Phase 5 Verification Fixtures Under packages/cli/fixtures

<objective>
Close the remaining manual-verification setup gap for Phase 5. Keep it narrow: add committed fixture configs and external addon fixture packages for the local-addon, warning-isolation, apiVersion-mismatch, and npm-addon checks, then point the verification docs and project state at those fixtures.
</objective>

## Tasks

<task id="010-01">
<title>Add runnable external-addon verification fixtures</title>
<files>
- packages/cli/fixtures/phase-5/README.md
- packages/cli/fixtures/phase-5/config.local-addon.yml
- packages/cli/fixtures/phase-5/config.warning-isolation.yml
- packages/cli/fixtures/phase-5/config.api-version-mismatch.yml
- packages/cli/fixtures/phase-5/config.npm-addon.yml
- packages/cli/fixtures/phase-5/local-clock-addon/package.json
- packages/cli/fixtures/phase-5/local-clock-addon/src/index.js
- packages/cli/fixtures/phase-5/broken-local-addon/package.json
- packages/cli/fixtures/phase-5/broken-local-addon/src/index.js
- packages/cli/fixtures/phase-5/version-mismatch-addon/package.json
- packages/cli/fixtures/phase-5/version-mismatch-addon/src/index.js
- packages/cli/fixtures/phase-5/community-addon/package.json
- packages/cli/fixtures/phase-5/community-addon/src/index.js
</files>
<action>
Add the smallest real fixture set that matches the addon loader contract already shipped in Phase 5. The local verification configs must be runnable directly from the repo with `--config` pointing at this fixture directory, and the npm fixture package must at least be committed in installable form so the npm verification path stops depending on an imaginary package.
</action>
<verify>
grep -n "local-clock-addon\|broken-local-addon\|version-mismatch-addon\|@sireno-deck/community-addon" packages/cli/fixtures/phase-5/README.md packages/cli/fixtures/phase-5/*.yml packages/cli/fixtures/phase-5/*/package.json
</verify>
<done>
Phase 5 manual verification has committed addon fixture packages and matching config inputs instead of one-off local setup.
</done>
</task>

<task id="010-02">
<title>Point Phase 5 verification docs and project state at the new fixtures</title>
<files>
- .planning/phases/05-addon-system/05-UAT.md
- .planning/phases/05-addon-system/05-VERIFICATION.md
- CHANGELOG.md
- .planning/STATE.md
</files>
<action>
Reference the new fixture configs from the remaining manual UAT checks, record the change in the changelog, and update project state so the next `verify-work 5` pass starts from the committed fixture set.
</action>
<verify>
grep -n "packages/cli/fixtures/phase-5" .planning/phases/05-addon-system/05-UAT.md .planning/phases/05-addon-system/05-VERIFICATION.md .planning/STATE.md
</verify>
<done>
The verification handoff now names the exact committed inputs to use for the remaining Phase 5 addon checks.
</done>
</task>
