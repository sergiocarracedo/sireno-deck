## Phase 7 Review Fixtures

These fixtures pin the manual review inputs for the remaining Phase 7 typography and text-behavior checks.

- `config.shared-dark.yml`: shared text output using the built-in dark theme.
- `config.shared-light.yml`: the same shared text layout using the built-in light theme so the typography/theme switch is visible during review.
- `config.wrapper-contract.yml`: enables the local `phase-7-review-addon` fixture so review can compare an addon-authored shared-wrapper button against a bespoke button that bypasses the wrapper.

Local addon fixture package:

- `phase-7-review-addon/`: local addon exposing `phase-7-shared-wrapper-button` and `phase-7-bespoke-button` for the optional wrapper-contract review step.

All configs assume Sireno is started with `--config` pointing at one of the YAML files in this directory so relative addon paths resolve from here.
