---
phase: 11
slug: session-config-contracts
status: verified
threats_open: 0
created: 2026-05-17
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Config file -> loader/runtime | User-authored YAML is parsed, interpolated, and validated before runtime execution | Config values, command strings, deck ids |
| Host OS -> host context | `systeminformation` and session-monitor output are normalized into the canonical host/session contract | OS type, distro/codename, release/build, session capability/state |
| Runtime -> shell command execution | Runtime and action executor pass interpolated command strings to `/bin/sh -c` | Shell command text containing config values and host-context placeholders |
| Session monitor -> runtime lock mode | Session capability/state updates change visible deck behavior and restore navigation state | Lock/unlock state transitions |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-11-01 | Tampering / Elevation of Privilege | `packages/cli/src/action/executor.ts`, `packages/cli/src/config/loader.ts`, `packages/cli/src/deck/runtime.ts`, `packages/cli/src/system/host-context.ts` | mitigate | Closed. `{{host.*}}` values remain readable in config/render interpolation, but command-bearing fields now keep placeholders unresolved until `executeCommand()` shell-quotes them at the `/bin/sh -c` boundary. Runtime no longer pre-resolves command strings ahead of that boundary. | closed |
| T-11-02 | Tampering | `packages/cli/src/core/schemas.ts` | mitigate | Closed by explicit validation of `session.locked_deck` against the deck map, with preserved `ConfigValidationError` path/line reporting for broken references. | closed |
| T-11-03 | Repudiation / Tampering | `packages/cli/src/system/session-monitor.ts`, `packages/cli/src/cli/commands/start.ts` | mitigate | Closed. Linux now claims `session.capability: supported` only after a live `org.gnome.ScreenSaver` DBus monitor initializes and returns an initial state. Initialization failure downgrades cleanly to `unsupported`, preserving the existing startup warning path instead of overclaiming support. | closed |

*Status: closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*
*STRIDE categories: Spoofing · Tampering · Repudiation · Information Disclosure · Denial of Service · Elevation of Privilege*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-17 | 3 | 3 | 0 | OpenCode secure-phase workflow |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** pending manual supported-host confirmation for the GNOME session-monitor path; code-level mitigations are in place.
