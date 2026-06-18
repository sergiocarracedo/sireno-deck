# Requirements — Sireno Deck

**Version:** v1.7 — Polish & 3rd-Party Fixtures
**Last updated:** 2026-06-17

## Milestone Scope

Milestone `v1.7 — Polish & 3rd-Party Fixtures` builds on v1.6's shipped overlay, settings, performance, and chrome-deck foundation. v1.7 closes the seam-level bugs that survived the v1.6 verification sweep (gesture timing, pasteText semantics, system-buttons dispatcher, deck icon plumbing, macro error surfacing, bars formatting) and ships a new multi-value builtin addon so users can render 1–3 live values on a single button without hand-rolling an addon. It also lands the first real 3rd-party fixtures — a custom addon and a custom theme — that exercise the loader seams as a real external author would, and documents the trust model honestly.

**Eleven v1.7 items in priority order:**

1. **Gesture state machine hardening** — close the perceived 400ms system-back delay (real-hardware profile) and make double-tap semantics strict: a second press within `DOUBLE_TAP_DELAY_MS` suppresses both presses when no `onDblTap` is configured.
2. **System-buttons dispatcher + deck icon** — when `autoShow: false`, the 2-line back variant uses `SplitActionSurface` with a 2xTap action that walks the underlying deck's history stack (not `dismissOverlay`); add `icon?: string` to `CoreDeckConfigSchema` and surface it in the overlay toggle.
3. **Paste semantics + macro error surfacing** — `methods.pasteText` now actually simulates the OS paste keystroke after the clipboard write (closes the v1.6 EMO-15 verification gap); `keyMacroProvider` failures (e.g. `xdotool` exit non-zero) are surfaced through the runtime-button-error helper instead of being silently swallowed.
4. **Shared value formatter + label-values cap** — `Bars` gets a `formatter` prop (default no-decimal via numbro `mantissa: 0, optionalMantissa: true`); `system-status-label-values` is capped at 2 key+value pairs (3+ becomes a schema error; users needing 3+ use the new `value-display` addon).
5. **New `value-display` builtin** — first-party addon that renders 1–3 values from per-value user-configured shell commands with shared `SystemStatusFormatter` vocabulary and full `tap | dbltap | hold` action wiring via `useButtonActionCommand`.
6. **3rd-party addon fixture** — a real 3rd-party addon at the absolute path `/works/test/test-sireno-deck` (outside this repo) with a custom button type (solid-color cycling button) and a 30+ color deck that exercises pagination, action commands, and theme tokens as a real external author would.
7. **3rd-party theme fixture** — a real 3rd-party theme at the absolute path `/works/test/test-sireno-deck-theme` (outside this repo) using yellow-based colors and replacing all UI components with its own alternatives; documents the v1 trust model (trusted in-process, no sandbox) honestly in the addon/theme READMEs.

**Theme:** Polish & 3rd-Party Fixtures
**Total v1.7 requirements:** 11

## v1.7 Requirements

### Bug fixes (new BUG-*)

| ID | Requirement | Category |
|----|-------------|----------|
| BUG-01 | The system-reserved back button transition (settings-deck → previous-deck landing on real hardware) completes in <200ms measured end-to-end. v1.6 measured the back-pop animation transition, not the settings→deck landing — v1.7 must re-profile the actual path and fix the root cause. Real-hardware profile is required (not in-process simulation). | Performance |
| BUG-02 | When a button has an `onTap` handler but no `onDblTap` handler, a second press within `DOUBLE_TAP_DELAY_MS` suppresses BOTH presses — neither fires `onTap` nor `onDblTap`. The runtime waits the full `DOUBLE_TAP_DELAY_MS` window before declaring a single-tap. This is the strict interpretation of the original bug report ("if no dbltap callback, the dbltap should do nothing"). No forgiving single-tap fallback. | Gesture |
| BUG-03 | When an active-app overlay deck is configured with `autoShow: false`, the system back button in the base deck's last position renders as a 2-line `SplitActionSurface` variant: line 1 back icon + "Tap", line 2 overlay deck icon + "2xTap". The 2xTap action walks the underlying base deck's history stack (equivalent to `dismissOverlay()` only when the overlay is at the root of its own history; otherwise it pops the overlay's own page history first). The dispatcher has access to both stacks. *(Documentation: the 2-line variant only triggers when an overlay deck with `autoShow: false` and matching `process_names` is configured — documented in README and packages/cli/README.md.)* | Controller |
| BUG-04 | `CoreDeckConfigSchema` accepts an optional `icon?: string` field. The `icon` survives `parseRawDeck` and reaches `OverlayToggleButton`, which renders the deck's `icon` (from the addon manifest or the deck `icon` field) next to the `send-to-back` icon. A deck without an `icon` falls back to the deck name initial or the existing `app-window` placeholder. *(Documentation: the `icon` field uses the same icon path resolution as action buttons — `icon://` = Lucide name, not custom logo. Fallback chain documented in README and packages/cli/README.md.)* | Schema |
| BUG-05 | `methods.pasteText(text: string)` writes `text` to the system clipboard AND simulates the OS paste keystroke (Ctrl+V on Linux/Windows, Cmd+V on macOS) so the text appears in the active input. The function name `pasteText` is preserved (no rename). This closes the v1.6 EMO-15 verification gap — the keystroke half was never actually wired in v1.6. | Domain |
| BUG-06 | `keyMacroProvider` failures (e.g. `xdotool` exit non-zero on Linux, `osascript` failure on macOS, `SendKeys` rejection on Windows) are surfaced through the existing runtime-button-error helper so the failure is logged with the button context and the macro fails loudly. The current `// Non-fatal` swallow in `linux.ts:91-93` is removed. | Device |
| BUG-07 | The `Bars` TSX component accepts a `formatter?: (value: number) => string` prop. Default formatter: `numbro` with `mantissa: 0, optionalMantissa: true` (no decimals, with thousands separator). Addon authors can pass any formatter. The in-bar rotated text uses the formatter output. **Deferred for v1.7** — see `.planning/phases/74-shared-formatter-label-values-cap/74-DISCUSSION-LOG.md`. The existing `displayValue` field on `BarsItem` + system-status addon's per-metric `SystemStatusFormatter` enum cover the use case. If a future phase needs component-level numeric formatting, it can re-evaluate. | UI |

### Features (new FEAT-*)

| ID | Requirement | Category |
|----|-------------|----------|
| FEAT-01 | The bundled `system-status-label-values` addon accepts 1 or 2 key+value pairs only. Configuring 3+ values is a schema error (`zod` `z.array(...).max(2)`). The "triple" 3-line layout that was explored in v1.6 research is **not** shipped — users needing 3+ values use the new `value-display` addon (FEAT-02). | Addon |
| FEAT-02 | A new first-party `value-display` addon is shipped under `packages/cli/src/builtin-addons/value-display/`. It renders 1–3 values from per-value user-configured shell commands. Per-value config: `command` (required, returns the value as stdout), `label` (required), `icon?` (optional), `formatter?` (optional, reuses `SystemStatusFormatter` vocabulary), `units?` (optional string appended after the formatted value). Action wiring uses `useButtonActionCommand` so users can configure `commands.tap | hold | double-tap` per button. Layout auto-selects for 1, 2, or 3 values. | Addon |

### 3rd-party ecosystem (new 3RD-*)

| ID | Requirement | Category |
|----|-------------|----------|
| 3RD-01 | A real 3rd-party addon lives at the absolute path `/works/test/test-sireno-deck` (outside this repo). It declares `apiVersion: 1` in its `sirenoAddon` export and provides: (a) a new button type (e.g. a solid-color button that cycles through a palette of 30+ named colors once per second, demonstrating the addon author can write a custom `defineMountedButton` with internal state), (b) a deck of 30+ action buttons, each rendering a color swatch with the color name and pasting the corresponding `#rrggbb` hex code on tap (exercising the pagination, action, and theme-token seams as a real external author would). | Ecosystem |
| 3RD-02 | A real 3rd-party theme lives at the absolute path `/works/test/test-sireno-deck-theme` (outside this repo). It uses yellow-based color tokens and replaces every UI component (background, accent, text, button frame, surface) with its own alternative token set. The theme README documents honestly that v1 addons are trusted in-process code with no sandbox, and explains what an external author should and should not assume about the runtime. | Ecosystem |

### Verification

| ID | Requirement | Category |
|----|-------------|----------|
| VERIFY-03 | Tests and fixtures cover: gesture state machine (single-tap, double-tap, no-callback-dbltap, hold-during-tap-window); `SplitActionSurface` dispatch in `autoShow: false` mode; deck `icon` schema + `OverlayToggleButton` render; `pasteText` keystroke injection on at least one OS; `keyMacroProvider` error surfacing; `Bars` default formatter; `value-display` addon (1, 2, 3 value layouts + actions); 3rd-party addon loader (loads from `/works/test/test-sireno-deck`); 3rd-party theme loader (loads from `/works/test/test-sireno-deck-theme`). | Verification |

## v1.6 Requirements (shipped)

*See `.planning/milestones/v1.6-REQUIREMENTS.md` for the shipped v1.6 requirements.*

## v2 Candidates / Deferred Items

| Item | Why Deferred |
|------|--------------|
| Distribution build pipeline | v1.7 scope is seam-level fixes + 3rd-party fixtures; native FFI / Bun compile / source distribution is a separate decision track |
| CI matrix builds for macOS/Windows | v1.7 hardware caveat pattern follows v1.6: at least one OS verified per requirement, manual cross-platform for the rest |
| Sandboxed 3rd-party addons | v1 explicitly trusts in-process addons. Real sandboxing (e.g. `node:vm` with allowlist, separate process + IPC) is v2+ scope. The 3RD-02 README documents this honest trust model. |
| Bumping `SIRENO_ADDON_API_VERSION` | All v1.7 changes are additive and backwards compatible. `apiVersion` stays at 1. |
| Configurable `DOUBLE_TAP_DELAY_MS` | BUG-02 only makes the existing 350ms window strict; configurable threshold is a separate UX decision |
| Auto-brightness | Manual brightness only. Auto policy needs a different decision model. |
| clipboardy 4 → 5 bump (Wayland-native paste) | v1.6 EMO-15 fix uses `xdotool`; Wayland-native `wl-copy`+`wtype` is a follow-up if/when the platform mix demands it |
| Theme picker UI | v1.7 theme fixture exercises the loader. A user-facing theme picker is separate work. |
| Real key_macro test on macOS/Windows | BUG-06 error surfacing is verified on at least one OS; full cross-platform CI is deferred |
| Conditional `display_commands` per platform | v1.7 value-display uses one command per value, with platform-agnostic shell semantics. Conditional execution is a follow-up. |

---

*Requirements defined: 2026-06-17*
*Total v1.7 requirements: 11*
