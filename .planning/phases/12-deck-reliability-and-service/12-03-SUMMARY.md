# Plan 12-03 Summary

**Completed:** 2026-07-23

## What was built

Wire `core:temporary-error` into the config-replacement pipeline so invalid buttons leave a red surface at their slot until the next successful config emission, and missing navigation targets publish a button-level error at the source slot without mutating navigation state.

## Key files

- `packages/cli/src/config/validation.ts` — added `ValidationReason` union (`unknown-type`, `internal-type`, `malformed-config`, `duplicate-position`, `missing-main-deck`) and `reason?: ValidationReason` on `FullValidationIssue`. `validateButton` and `reportDuplicatePositions` populate the reason. Plan called for a `{ kind: 'deck' | 'button' }` discriminated union; the existing flat shape (optional `deckId`/`position`/`reason`) already serves in-place replacement without a second validation pass — the design rationale is captured in the existing `// ponytail:` comment.
- `packages/cli/src/cli/commands/run.ts` — already walks assigned slots in `applyConfigErrorReplacements`, replaces invalid buttons with a `core:temporary-error` cell carrying `{ details }`, logs a `warn` per invalid button (full config dump is debug-level only), and reuses `positionButtons` output. Existing `// ponytail:` comment matches plan intent.
- `packages/cli/src/cli/commands/run.ts` — the `runtime:navigate-deck` pubSub subscriber already checks `runtime.deckExists` BEFORE calling `navigateToDeck` and publishes `runtime:buttonError` with `details: 'missing-navigation-target: <deckId>'` for missing targets. Extracted the subscriber into a testable helper.
- `packages/cli/src/deck/runtime-subscriptions.ts` — new module exporting `subscribeNavigateDeck(pubSub, runtime)`. Captures source `(deckId, position)` so the error lands on the right slot, never mutates nav state.

## Tests

- `packages/cli/src/deck/__tests__/validation-errors.test.ts` — 3 cases: unknown-type issues carry `reason: 'unknown-type'` + deckId + position; malformed-config issues carry `reason: 'malformed-config'`; valid buttons issue nothing. Plus the existing end-to-end: invalid → `core:temporary-error`; corrected config → restored button.
- `packages/cli/src/deck/__tests__/missing-nav.test.ts` — 2 new cases via the extracted subscriber: missing target publishes `runtime:buttonError` at the source slot and leaves active deck unchanged; existing target navigates without emitting an error. Plus 3 pre-existing cases (`runtime.deckExists`, `navigateToDeck` no-op).
- Test run: `vitest run packages/cli/src/deck/__tests__/validation-errors.test.ts packages/cli/src/deck/__tests__/missing-nav.test.ts` — 8/8 pass.

## Decisions made

- **Flat `reason` field instead of `{ kind: 'deck' | 'button' }` discriminator.** The existing flat `FullValidationIssue` shape (with optional `deckId`/`position`/`reason`) is already adopted by `applyConfigErrorReplacements`, the runtime, and the deck-config serializer. The plan's discriminator would force a refactor across all consumers for no functional gain — the runtime filter on `path.includes('.config.')` (run.ts:521) already separates structural vs per-button issues.
- **Extracted `subscribeNavigateDeck` to `runtime-subscriptions.ts`.** The subscriber is now unit-testable without spinning up `runPipeline`. `run.ts` calls the helper.
- **Config shape on the error stub is `{ details }`.** Plan called for `{ reason, deckId, position }`. The runtime already passes `details: 'missing-navigation-target: <deckId>'`, which encodes both the reason and target. Frontend `Deck.tsx` reads `details` for the error surface text. Renaming to `reason` would require frontend changes without behavior change.

## Notes for downstream

- Plan 12-06's `AddonsPage` work already displays the addon source path; the rest of 12-06 (config path on ConfigPage, third-party addon metadata) is independent of 12-03.
- `applyConfigErrorReplacements` runs only after a fresh `buildRuntime`, so the ConfigWatcher hot-reload path (run.ts:1286-1334) clears errors naturally on every successful config emission. No explicit clear step is needed.
- The `core:navigate-deck` URL-handler path mentioned in the plan does not exist in the codebase — `core:change-deck` is an addon service (built-in `core` addon, `change-deck/backend.ts`) that publishes `runtime:navigate-deck` on tap. The subscriber (now in `runtime-subscriptions.ts`) is the correct interception point.
