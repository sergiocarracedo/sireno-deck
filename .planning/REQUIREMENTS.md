# Requirements — Sireno Deck

**Version:** v1.2
**Last updated:** 2026-05-18

## Milestone Scope

Milestone `v1.2 Session Context and Surface Composition` builds on the completed `v1.1` addon authoring, text rendering, and date/time widget work. This document tracks only the new requirements for the follow-on milestone so planning stays focused on the new session-aware runtime and render-surface contracts.

## v1.2 Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| SCS-01 | Core runtime exposes a normalized session/OS context containing OS type, variant, and version | Runtime |
| SCS-02 | The normalized session/OS context is available to addon render logic, action/status execution, and config templating through one consistent contract | Runtime |
| SCS-03 | Config and render flow support layered background resolution with precedence: config override -> deck background -> theme background | Render |
| SCS-04 | The render contract supports multiple explicit text fitting modes, including default shrink-to-fit until a readable minimum size then clip, plus wrap mode | Render |
| SCS-05 | Addons can register globally reusable wrapper/style primitives that other addon or built-in surfaces can reference through validated public contracts | Addon Authoring |
| SCS-06 | Built-in toggle buttons support internal-state toggles with runtime-owned state continuity across normal deck/runtime lifecycle events | Widgets |
| SCS-07 | Built-in command-driven toggles support both `get_state + set_on/set_off` and `toggle + status` models | Widgets |
| SCS-08 | Runtime detects supported session lock/unlock transitions, switches to a dedicated locked-session deck while locked, dims after five minutes of locked time, and restores prior deck state on unlock | Runtime |
| SCS-09 | Tests, fixtures, and shipped examples cover session context injection, background layering, text fitting, global wrappers/styles, richer toggles, and locked-session behavior | Verification |

## Implementation Sequencing Notes

- **Phase 11 lands:** `SCS-01`, `SCS-02`, and the contract/switch/restore subset of `SCS-08` — canonical host/session context, host-aware config/action/render injection, validated `session.locked_deck`, unsupported-host startup warning, locked-surface switching, implicit fallback support, and exact unlock restore.
- **Phase 12 lands:** `SCS-03` and `SCS-04` — core-owned background config, explicit `button -> deck -> theme` resolution, explicit `fit` render modes, default shrink-to-fit with a renderer-owned floor, wrap support, and committed review fixtures for both contracts.
- **Phase 13 lands:** `SCS-05` — addon registry-backed wrapper/style primitive definitions, direct `wrapper_id` / `style_id` public references, early config/runtime validation for unknown refs, shared/default primitive consumption, and committed test/fixture proof that reuse works beyond one addon-local implementation.
- **Phase 22 follow-on emulator work:** post-roadmap developer tooling on top of the shipped browser runtime — hardware-free emulator startup, virtual device event transport, browser-driven `down` / `up` interaction with visible pressed-state feedback, supported virtual device selection, and honest layout mismatch failures.
- **Phase 16 follow-on polish lands:** post-roadmap config/render/runtime hardening on top of the v1.2 surface — deck-only external deck references, watched config reload with navigation restoration, shared-wrapper footer removal, narrow button-level accent overrides, and runtime-owned invalid-reload error fallback.
- **Phase 15 still owns:** the five-minute dimming clause in `SCS-08` plus the broader milestone-wide verification surface in `SCS-09`.
- **Known hardening gap:** the first `session-monitor` seam is intentionally narrow and honest about unsupported hosts, but it still needs a real supported-host event source to fully satisfy the live lock-detection promise in `SCS-08`.

## v2 Candidates

| Item | Why Deferred |
|------|--------------|
| Cross-platform lock/session parity beyond the first documented supported path | The milestone should ship one documented support path instead of pretending every desktop environment behaves the same |
| Broader context injection beyond OS type, variant, and version | Wider context increases API surface and validation burden without being required for this milestone |
| More advanced style systems beyond narrow wrapper/style primitives | A CSS-like or theme-engine expansion would swamp the milestone |
| Richer dimming or overlay behaviors beyond locked-deck substitution | The requested behavior is deck substitution plus timed dimming; more visual states can wait |

## Out of Scope For v1.2

| Item | Reason |
|------|--------|
| Full CSS-like styling system | The renderer should gain narrow explicit primitives, not a broad styling language |
| Fake universal lock detection across all platforms/desktops without documented support | Unsupported environments should degrade explicitly, not lie |
| Renderer-specific background fallback rules | Background precedence must be one shared contract |
| Per-addon host probing for OS/session state | Host context should be normalized once in core and injected consistently |

---

*Requirements defined: 2026-05-17*
*Total v1.2 requirements: 9*
