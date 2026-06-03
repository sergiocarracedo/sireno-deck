# Phase 16: Config Reload + Wrapper Polish - Discussion Log

**Gathered:** 2026-05-19
**Mode:** standard
**Status:** Captured

## Areas Discussed

### Deck File References

**Decision point:** What should a referenced deck file contain?
- Options considered:
  - Full deck object
  - Deck body only
  - Support both
- User choice: `Full deck object`
- Rationale: Keeps referenced files aligned with the existing inline deck shape and preserves the current `id` consistency rule.

**Decision point:** How should `@path` be resolved?
- Options considered:
  - Relative paths only
  - Root-config-relative
  - Absolute and relative paths
- User choice: `Allow both absolute and relative`
- Rationale: Flexible authoring without blocking absolute-path use cases.

**Decision point:** What is the base for relative paths?
- Options considered:
  - Owning file
  - Root config file
  - Process cwd
- User choice: `Owning file`
- Rationale: Makes referenced files self-contained and avoids cwd surprises.

**Decision point:** How broad should include support be?
- Options considered:
  - Deck refs only
  - Any nested section
  - Decks plus themes
- User choice: `Deck refs only`
- Rationale: Keeps the phase inside its stated boundary instead of becoming a generic include system.

### Config Hot-Reload

**Decision point:** What happens when a reload is invalid?
- Options considered:
  - Keep last good config
  - Show error deck
  - Stop the daemon
- User choice: `Show error deck`
- Rationale: Invalid edits should be visible on the device rather than only in logs.

**Decision point:** Which files should trigger reload?
- Options considered:
  - Root plus loaded refs
  - Root config only
  - Whole config tree
- User choice: `Root plus loaded refs`
- Rationale: Referenced deck files are part of the live config surface and should reload when edited.

**Decision point:** What should the error-deck implementation be?
- Options considered:
  - Built-in temporary error deck
  - User-configurable error deck
  - Only current key shows error
- User choice: `Built-in temporary error deck`
- Rationale: The fallback must not depend on broken config and should auto-recover on the next valid reload.

### Successful Reload Continuity

**Decision point:** How should deck navigation be restored after a valid reload?
- Options considered:
  - Preserve stack when valid
  - Preserve active deck only
  - Always reset to main deck
- User choice: `Preserve stack when valid`
- Rationale: Keep as much live user context as possible without restoring invalid deck ids.

**Decision point:** What happens to runtime button instance state after a valid reload?
- Options considered:
  - Rebuild everything
  - Preserve matching buttons
  - Preserve by opt-in only
- User choice: `Rebuild everything`
- Rationale: Config should stay authoritative and reload should avoid fragile state-migration heuristics.

### Shared Wrapper Cleanup

**Decision point:** How should accent customization be authored?
- Options considered:
  - Token or raw color
  - Tokens only
  - Raw colors only
- User choice: `Token or raw color`
- Rationale: Preserve theme reuse while allowing one-off color tuning.

**Decision point:** Where should the accent override live?
- Options considered:
  - Per button override
  - Wrapper primitive default only
  - Both default and override
- User choice: `Per button override`
- Rationale: Keep the feature narrow and directly useful without widening the primitive system.

**Decision point:** What happens to the current theme-name footer?
- Options considered:
  - Remove it entirely
  - Hide by default, opt in later
  - Replace it with something else
- User choice: `Remove it entirely`
- Rationale: Straightforward interpretation of the cleanup request and the smallest visual contract change.

## Agent's Discretion

- Exact field names for the accent override contract.
- Exact watcher/debounce implementation.
- Exact layout/content of the temporary built-in error deck.
- Exact accepted raw color formats, as long as they are deterministic and validated.

## Deferred Ideas

- Generic YAML include support beyond deck references.
- Theme-file references.
- Configurable error decks.
- Runtime state migration across reloads.
- Broader styling-system expansion.

---
*Phase: 16-config-reload-wrapper-polish*
*Discussion captured: 2026-05-19*
