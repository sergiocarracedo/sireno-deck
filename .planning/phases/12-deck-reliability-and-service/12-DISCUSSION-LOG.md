---
phase: 12
slug: deck-reliability-and-service
areas_discussed: [System-status migration, Deck position assignment, Error-surface behavior, Emulator presentation, Logging, Background service]
created: 2026-07-22
---

# Phase 12: Deck Reliability, Emulator UX, Logging, and Background Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 12 - Deck Reliability, Emulator UX, Logging, and Background Service
**Areas discussed:** System-status migration, Deck position assignment, Error-surface behavior, Emulator presentation, Logging, Background service

---

## System-status migration

| Option | Description | Selected |
|--------|-------------|----------|
| Legacy generic button | Port the legacy generic button/service contract and remove CPU/RAM/disk/net-specific registrations. | ✓ |
| Repair dedicated buttons | Keep metric-specific types and only repair their frontend rendering. | |
| New generic contract | Create a new generic contract without preserving the legacy shape. | |

**User's choice:** Legacy generic button (Recommended).
**Notes:** The user requested using the legacy addon as the base because current system-status buttons are empty.

### System-status compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Hard cutover | Remove dedicated types; stale configs render normal invalid-button errors. | ✓ |
| Temporary aliases | Keep deprecated aliases for one release. | |
| Permanent wrappers | Keep old types indefinitely. | |

**User's choice:** Hard cutover (Recommended).

### System-status feature scope

| Option | Description | Selected |
|--------|-------------|----------|
| Feature-parity port | Migrate legacy metric catalog, up to three metrics, text/bars, formatters, intervals, and commands. | ✓ |
| Minimal subset | Migrate only text rendering and core metrics. | |
| Legacy UI only | Keep the legacy UI but retain the current smaller backend contract. | |

**User's choice:** Feature-parity port (Recommended).

### Unavailable metrics

| Option | Description | Selected |
|--------|-------------|----------|
| Legacy availability behavior | Unsupported metrics render unavailable without blocking the addon. | ✓ |
| Strict platform validation | Reject unsupported configured metrics. | |
| Current metrics only | Limit the catalog to metrics already implemented here. | |

**User's choice:** Legacy availability behavior (Recommended).

---

## Deck position assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Reflow duplicates | First explicit position wins; later duplicates fill gaps in config order. | ✓ |
| Show duplicate errors | Later duplicates become error surfaces. | |
| Drop duplicates | Drop later duplicates entirely. | |

**User's choice:** Reflow duplicates (Recommended).

### Key-count changes

| Option | Description | Selected |
|--------|-------------|----------|
| Recompute from config | Re-run assignment from source config for every key-count change. | ✓ |
| Preserve assignments | Keep old assigned positions and truncate/append around the change. | |
| Reload-only | Require a full config reload. | |

**User's choice:** Recompute from config (Recommended).

### Overflow and holes

| Option | Description | Selected |
|--------|-------------|----------|
| Sparse deck output | Send only assigned buttons; empty slots remain empty; overflow is omitted. | ✓ |
| Fill every slot | Generate error surfaces for empty/overflow positions. | |
| Reject deck | Reject the whole deck on overflow. | |

**User's choice:** Sparse deck output (Recommended).

---

## Error-surface behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve layout slot | Invalid buttons keep explicit slots; invalid unpositioned buttons receive normal slots and become error surfaces. | ✓ |
| Shift later buttons | Remove invalid buttons and let later buttons move. | |
| Reject deck | Reject the entire deck configuration. | |

**User's choice:** Preserve layout slot (Recommended).

### Config error lifetime

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent until reload | Keep the error visible until config is fixed/reloaded. | ✓ |
| Temporary then empty | Show for five seconds, then leave the slot empty. | |
| Temporary then button | Show for five seconds, then render the invalid button. | |

**User's choice:** Persistent until reload (Recommended).

### Missing deck target

| Option | Description | Selected |
|--------|-------------|----------|
| Error at source slot | Show the error at the initiating button position and leave navigation unchanged. | ✓ |
| Dedicated error deck | Navigate to a generated error deck. | |
| Log only | Log the error and leave the current deck unchanged. | |

**User's choice:** Error at source slot (Recommended).

---

## Emulator presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Single wrapped tag flow | One wrapped colored-tag flow with legend, preserving addon/deck/button distinctions through labels. | ✓ |
| Grouped rows | Separate addon/deck rows with buttons beneath each deck. | |
| Table | Compact table with colored badges. | |

**User's choice:** Single wrapped tag flow (Recommended).

### Config path

| Option | Description | Selected |
|--------|-------------|----------|
| Resolved path | Show the absolute resolved config path. | ✓ |
| Original path | Show the path spelling passed to the CLI. | |
| Both paths | Show original and resolved paths. | |

**User's choice:** Resolved path (Recommended).

---

## Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Compact structured logs | Keep structured fields, render stable context inline, and hide redundant dumps outside debug logging. | ✓ |
| Message-only cleanup | Keep structured JSON and shorten only message text. | |
| Custom flattened formatter | Flatten every object field into the message string. | |

**User's choice:** Compact structured logs (Recommended).

**Specific example:** `20:33:48 INFO emulator: button-action received (deckId: main, position: 11, gesture: tap)`.

---

## Background service

| Option | Description | Selected |
|--------|-------------|----------|
| Native per-OS service | Install a native user service for Linux, macOS, and Windows with shared CLI lifecycle commands. | ✓ |
| Linux first | Implement systemd first and defer other platforms. | |
| Portable daemon only | Use a cross-platform Node background process without service registration. | |

**User's choice:** Native per-OS service (Recommended).

### Service config ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Persist config path | Resolve/store the path at start; later commands use it unless replaced. | ✓ |
| Explicit every time | Require `--config` for every service command. | |
| Copy config | Copy the config into service state and run only from the copy. | |

**User's choice:** Persist config path (Recommended).

### Child lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Tracked children plus tree kill | Track child PIDs, terminate them on lifecycle events, use process-tree/group termination where supported, and prune stale state. | ✓ |
| Direct PIDs only | Terminate only direct children. | |
| Service manager only | Rely entirely on the service manager. | |

**User's choice:** Tracked children plus tree kill (Recommended).

### Service logs

| Option | Description | Selected |
|--------|-------------|----------|
| Native system logs | Use journald, launchd/unified logging, or the Windows equivalent; foreground mode remains terminal-based. | ✓ |
| Rotating log files | Always write files under service state. | |
| Both | Use native logs and files by default. | |

**User's choice:** Native system logs (Recommended).

---

## Agent's Discretion

- Exact adapters, file layout, metric probes, tag styling, service templates/install mechanisms, control protocol, process-tree implementation, and logger wiring are delegated to research and planning within the locked decisions above.

## Deferred Ideas

None — discussion stayed within the Phase 12 boundary.

---

*Phase: 12-deck-reliability-and-service*
*Discussion log generated: 2026-07-22*
