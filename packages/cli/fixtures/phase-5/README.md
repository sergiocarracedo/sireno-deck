## Phase 5 Verification Fixtures

These fixtures pin the manual verification inputs for the remaining Phase 5 addon checks.

- `config.local-addon.yml`: healthy local-folder addon startup using `./local-clock-addon`.
- `config.warning-isolation.yml`: one healthy local addon plus one broken-import addon; startup should warn once and keep going.
- `config.api-version-mismatch.yml`: incompatible addon manifest; startup should exit before runtime rendering with a clear addon apiVersion error, so no button-local helper should appear for this fixture. Rerun/closure trail: `05-05-PLAN.md`.
- `config.npm-addon.yml`: npm-style addon startup using `@sireno-deck/community-addon` after that fixture package is installed or linked into the environment running the CLI.

Local addon fixture packages:

- `local-clock-addon/`: valid local addon that registers `local-clock-button`.
- `broken-local-addon/`: valid manifest with a broken entrypoint import.
- `version-mismatch-addon/`: addon manifest intentionally declaring `apiVersion: 99`.
- `community-addon/`: installable npm-style fixture package registering `community-wave-button`.

All `source: local` configs assume Sireno is started with `--config` pointing at one of the YAML files in this directory so relative addon paths resolve from here.
