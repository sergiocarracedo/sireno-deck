# Pitfalls Research

**Domain:** v1.2 session context and surface composition
**Researched:** 2026-05-17
**Confidence:** HIGH

## Common Mistakes

| # | Mistake | Severity | Why It Matters |
|---|---------|----------|----------------|
| 1 | Letting each addon or button probe OS/session state itself | HIGH | Creates drift, duplicate polling, and inconsistent lock behavior |
| 2 | Parsing human-readable `loginctl` output | HIGH | The man page explicitly reserves `show-session` for machine-readable output; formatted output is brittle |
| 3 | Implementing lock behavior as a visual overlay only | HIGH | The user asked for deck switching and restore semantics, which overlays do not model cleanly |
| 4 | Spreading background fallback logic across renderer variants | HIGH | Every built-in visual will drift on precedence and tests will become archaeological nonsense |
| 5 | Treating text fitting as renderer magic instead of declared contract | HIGH | Addons, tests, and docs will all disagree on what “fit” means |
| 6 | Registering wrappers/styles without global identity | MEDIUM | “Global primitives” become impossible to reference safely from config and addons |
| 7 | Treating non-systemd Linux as if `loginctl` always exists | MEDIUM | Lock detection will fail silently on some environments unless degraded behavior is explicit |
| 8 | Mixing internal-state toggle semantics with command-driven toggle semantics in one hidden implementation | MEDIUM | The two models have different authority and recovery behavior |

## Warning Signs

| Warning Sign | Indicates | Action |
|-------------|-----------|--------|
| New addon examples start shelling out to `loginctl` or `uname` | core context injection failed | move host probing back into runtime service |
| Renderer functions each decide their own background fill source | precedence drift | resolve one background contract before variant selection |
| Long text behavior can only be described by “whatever the SVG does” | no render contract | add named fit modes and test them explicitly |
| Lock handling code starts living inside button instances | wrong ownership | keep lock switching in runtime / deck selection |
| Global wrapper/style names are raw strings with no registry validation | extension drift | add registration and lookup in addon registry |
| Unlock path does not restore prior deck stack | lossy session transition | store and restore runtime navigation state explicitly |

## Prevention Strategies

| Strategy | Prevents | How |
|----------|----------|-----|
| Normalize session context once in core | #1 | one shared snapshot type for config templating, render, and command/status execution |
| Use `loginctl show-session --property=... --value` only | #2 | consume parsable fields like `LockedHint`, `IdleHint`, `State` from documented machine-readable output |
| Model lock as deck substitution with saved prior state | #3, #6 | runtime stores active deck/back-stack and restores it after unlock |
| Resolve background precedence before building variant SVG | #4 | renderer receives final background source/value instead of re-deciding it |
| Add explicit text-fit enum and readable minimum font floor | #5 | make shrink, clip, and wrap behaviors visible in config and tests |
| Extend addon registry for global primitives | #6 | wrappers/styles are named assets of the extension ecosystem, not accidental conventions |
| Treat unsupported session environments as degraded, not broken | #7 | no silent fake lock-state; expose unavailable support path clearly |
| Split toggle implementations by authority model | #8 | internal-state toggles persist local state; command-driven toggles reconcile against external status |

---
*Pitfalls research for: v1.2 session context and surface composition*
*Researched: 2026-05-17*
