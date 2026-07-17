# Phase 6: Lock Deck — Discussion Log

**Date:** 2026-07-17
**Mode:** deep
**Phase:** 06-lock-deck

This log captures every option considered, the choice made, and the user's verbatim signals. It is for audit only — not referenced by downstream agents.

---

## Area 1 — Lock-mode layer model

### Q1.1: Layer coexistence

| Option | Choice | Rationale |
|---|---|---|
| Mutex flag with snapshot | **Selected (recommended)** | Simplest state surface; suspend/resume of overlay is a small extension. |
| 3rd layer (lock layer) | Rejected | User rejected because of state-surface duplication (3 stacks, 3 restore targets). |
| Reuse overlay with system overlay id | Rejected | Conflates system overlays with user-triggered ones. |

### Q1.2: Overlay state during lock

| Option | Choice |
|---|---|
| Suspend + auto-resume on unlock | **Selected (recommended)** |
| Clear on lock, manual re-toggle | Rejected — loses prior context |
| No overlay during lock, no resume on unlock | Rejected — same |

---

## Area 2 — Activation source & lifecycle

### Q2.1: Activation source

| Option | Choice |
|---|---|
| Session provider only | **Selected (recommended)** |
| Session + manual RPC | Rejected — no testing RPC needed yet |
| Session + config toggle | Rejected — feature should run by default |

### Q2.2: Lock deck lifecycle

| Option | Choice |
|---|---|
| Singleton, recreated on each lock | **Selected (recommended)** |
| Singleton, persistent | Rejected — stale-state risk |
| Per-cycle unique id | Rejected — overkill |

### Q2.3: Transition handling

| Option | Choice |
|---|---|
| Reactive, no debounce | **Selected (recommended)** |
| Debounce 300ms | Rejected |
| Polled 500ms | Rejected |

### Q2.4: Unknown session state

| Option | Choice |
|---|---|
| Lock mode never activates | **Selected (recommended)** |
| Always lock if not explicitly unlocked | Rejected — annoying on unsupported platforms |

---

## Area 3 — User-button action permissions

### Q3.1: Action allowlist

| Option | Choice |
|---|---|
| go-to-folder only (schema-stripped) | Rejected |
| go-to-folder + system toggles | Rejected |
| All actions allowed, gestures suppressed globally | **Selected** |

### Q3.2: Escape-hatch mechanism

| Option | Choice |
|---|---|
| Pre-check in gesture router | **Selected (recommended)** |
| All gestures work, dispatch is filtered | Rejected |

---

## Area 4 — Folder-escape re-lock semantics

### Q4.1: Re-lock trigger

| Option | Choice |
|---|---|
| Only on next OS lock | **Selected (recommended)** |
| Re-lock on idle / timeout | Rejected |
| Re-lock when back to root deck | Rejected |

---

## Area 5 — Default 3-button time layout

### Q5.1: Default 3-button slots

| Option | Choice |
|---|---|
| HH \| `:` \| MM | **Selected (recommended)** |
| hh-tens \| hh-ones \| minute | Rejected — visually uneven |
| hour \| separator \| minute | Rejected — same as recommended, kept for clarity only |

### Q5.2: Time source

| Option | Choice |
|---|---|
| Frontend wall clock | **Selected (recommended)** |
| Backend time provider | Rejected — over-plumbing |

---

## Area 6 — Config surface & protocol plumbing

### Q6.1: Schema shape

| Option | Choice |
|---|---|
| `lock: { buttons?, folder? }` | Rejected — user rejected `folder` field |
| `lock: { deck: DeckSpec? }` | Rejected — verbose |
| `lock: ButtonSpec[]?` | Rejected — loses future flexibility (but no `folder` field) |
| **`lock: { buttons?: ButtonSpec[] }`** | **Selected** — clean, allows `action` fields but runtime filters |

### Q6.2: Validation surface

| Option | Choice |
|---|---|
| Part of root config `.strict()` | **Selected (recommended)** |
| Separate lock schema, composed | Rejected |

### Q6.3: Protocol plumbing

| Option | Choice |
|---|---|
| Backend-only | **Selected (recommended)** |
| Plumb `lockMode` flag to frontend | Rejected |

### Q6.4: `lock.buttons` action fields

| Option | Choice |
|---|---|
| No action fields; folder shortcut separate | Rejected — see Q6.1 |
| Allow actions, suppress at runtime | **Selected** (consistent with Q3.1) |

### Q6.5: `lock.folder` rendering

| Option | Choice |
|---|---|
| Replace button 0, user buttons shift right | Rejected — `lock.folder` field removed entirely |
| Append as last button | Rejected |
| User-specified position | Rejected |

**User note (verbatim):** "remove lock.folder i dont know what is this"

---

## User-Verbatim Signals

- "Mutex flag (Recommended)" — layer model
- "Suspend + auto-resume (Recommended)" — overlay state
- "Session provider only (Recommended)" — activation
- "Singleton, recreated on each lock (Recommended)" — lifecycle
- "Reactive, no debounce (Recommended)" — transitions
- "Lock mode never activates (Recommended)" — unknown state
- "All actions allowed, gestures suppressed globally" — action permissions
- "Pre-check in gesture router (Recommended)" — escape hatch mechanism
- "Only on next OS lock (Recommended)" — re-lock semantics
- "HH | : | MM (Recommended)" — default slots
- "Frontend wall clock (Recommended)" — time source
- "lock.buttons + optional folder (Recommended)" — initially picked
- "Part of root config .strict() (Recommended)" — validation
- "Backend-only (Recommended)" — protocol
- "Yes — write CONTEXT.md" — wrap up

---

## Deferred Ideas

- Manual lock-mode RPC for testing
- Animation / transition on lock/unlock
- `lock.folder` shortcut field
- Custom lock-deck icon/label override beyond `lock.buttons` content
- Per-overlay re-lock on idle / back-to-root
- Front-end dimming / lock badge when lock mode active