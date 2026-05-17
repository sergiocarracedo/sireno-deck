# Research Summary

**Domain:** v1.2 session context and surface composition
**Researched:** 2026-05-17
**Confidence:** HIGH

## Executive Summary

This milestone is not mainly a widget milestone. It is a contract-widening milestone across config, runtime, addon API, registry, and renderer. The safest path is to keep the current TypeScript + React custom reconciler + SVG/`sharp` stack, add one core-owned OS/session context service, and route that same normalized context into config templating, addon render, and command/status execution. On Linux, `systeminformation.osInfo()` cleanly covers the requested OS type/variant/version fields, while `loginctl show-session` is the documented parsable source for lock-related session state. [HIGH: https://systeminformation.io/os.html] [HIGH: https://manpages.ubuntu.com/manpages/noble/en/man1/loginctl.1.html]

## Recommended Stack / Direction

- Keep the current runtime and renderer stack.
- Add a dedicated core session-context service instead of per-addon host probing.
- Use `systeminformation` for OS metadata only.
- Use `loginctl show-session` for Linux lock/session properties.
- Extend the addon registry with globally named wrapper/style primitives.
- Make text fitting an explicit render contract with named modes.

## Feature Recommendations

### Must-have for v1.2

- [ ] Add normalized OS/session context to core runtime
- [ ] Inject that context into config templating, addon render, and action/status execution
- [ ] Add background precedence contract: config override -> deck -> theme
- [ ] Add explicit text fitting modes with default shrink-then-clip and opt-in wrap
- [ ] Add globally registered addon wrapper/style primitives
- [ ] Add built-in internal-state and command-driven toggles
- [ ] Add locked-session deck switching, five-minute dimming, and unlock restore behavior

### Keep out of this milestone

- [ ] Fake full cross-platform lock-state parity without documented support paths
- [ ] CSS-like style system or broad design-language rewrite
- [ ] Per-addon host probing for OS/session state
- [ ] Renderer-specific background precedence rules

## Roadmap Implications

Recommended roadmap order for the new milestone:

1. Session and config contracts
2. Render surface growth: backgrounds plus text fitting
3. Global addon wrappers/styles
4. Built-in rich toggles
5. Lock-aware deck switching and dim/restore behavior

The reason for this order is simple: lock behavior and toggles depend on stable runtime/context seams, and global wrappers/styles depend on a stable render contract. Doing the flashy stuff first will make the later phases rewrite it.

## Primary Recommendation

Build one new backbone, not six isolated features. The backbone is: normalized session context plus explicit render surface contracts. If that lands cleanly, the rest of the milestone becomes straightforward. If it does not, the milestone turns into scattered special cases in runtime, addons, and renderer code.

---
*Research summary for: v1.2 session context and surface composition*
*Researched: 2026-05-17*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
