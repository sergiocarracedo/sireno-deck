# Phase 37: Partial Rerender on Source Changes - Discussion Log

**Phase:** 37 — Partial Rerender on Source Changes
**Date:** 2026-06-03
**Mode:** standard

---

## Options Considered

### Change Classification
| Option | Verdict |
|--------|---------|
| Change classification (config full reload, addon TSX/JSX/CSS per-button) | **Selected** — cleanly separates config vs. addon source change handling |
| Per-button invalidate for all changes | Not selected — full deck rerender kept |
| External tsx watch stays as full restart | Not selected — core watching is the new seam |

### Per-Button Invalidation
| Option | Verdict |
|--------|---------|
| Yes — position-keyed invalidation | Not selected — user chose to keep full deck rerender |
| No — keep full deck rerender on invalidate | **Selected** |
| Buffer diffing before write | Not selected — premature optimization |

### Addon Source Watching
| Option | Verdict |
|--------|---------|
| Per-addon directory watchers | Not selected — too many watchers, complexity |
| Root addons/ watcher | **Selected** — simpler, sufficient |
| External tsx watch for addon sources | Not selected — full restart is the existing seam |

### Source Change Flow (Addon)
| Option | Verdict |
|--------|---------|
| Registry diff → targeted re-render | **Selected** — lighter than full reloadRuntime, preserves runtime instance |
| Partial reloadRuntime() | Not selected — full reloadRuntime is heavier |

### Debounce Strategy
| Option | Verdict |
|--------|---------|
| 100ms debounce | **Selected** — catches IDE atomic writes, responsive enough |
| 50ms debounce | Not selected — less forgiving |
| 300ms debounce | Not selected — too sluggish |
| No debounce | Not selected — too noisy |

---

## Decisions Captured

1. **Change classification:** Config → full reloadRuntime; addon TSX/JSX/CSS → registry-diff path; theme sources → same per-button path; CSS → stylesheet reload only
2. **Per-button invalidation:** Keep full deck re-render on invalidate(); registry-diff identifies changed addons, full deck re-render still happens
3. **Addon source watching:** Single recursive watcher on `addons/` root directory
4. **Registry-diff path:** Rebuild addon registry on change, diff against running state, lighter than full reloadRuntime because runtime instance preserved
5. **Debounce:** 100ms trailing-edge debounce on addon root watcher

## Deferred to Agent's Discretion

- Exact debounce implementation (timer-based vs. trailing-edge edge)
- Structural vs. non-structural registry change detection criteria
- Logging of re-rendered addons

## Deferred Ideas

None.

---
*Phase: 37-partial-rerender-on-source-changes*
*Discussion completed: 2026-06-03*