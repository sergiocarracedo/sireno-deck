# Phase 50: Weather city-name + 2-day daily forecast - Discussion Log

**Gathered:** 2026-06-08
**Mode:** standard
**Purpose:** Human audit trail. NOT referenced by downstream agents.

---

## Gray areas selected for discussion

All four pre-identified gray areas were selected by the user:

1. Schema union (WX-07)
2. Ambiguous match (WX-08)
3. Geocoding timing (WX-08)
4. Page cycle (WX2-01)

---

## Area 1: Schema union (WX-07)

### Question: Schema union shape for the location config?

**Options considered:**

- **Direct zod union** — `z.union([z.string().min(1), z.object({latitude, longitude, name?})])`. Simplest, no extra type discriminator. Matches the prompt example exactly.
- **Discriminated union with 'type' field** — `{type: 'name', value: 'Vigo, Spain'}` vs `{type: 'coords', latitude, longitude, name?}`. Explicit and self-documenting but every existing config needs to be rewritten.
- **Wrap in a typed envelope** — keep the object form but accept a string via a transform that produces a placeholder object, with a separate `geocode: true` flag. Verbose; loses backward compatibility.

**User choice:** Discriminated union with 'type' field.

**Follow-up (conflict resolution):** The prompt example was `location: Vigo, Spain` (raw string), but the discriminated union would force users to write `location: {type: name, value: Vigo, Spain}`.

**User choice on conflict:** Accept raw string in config, normalize internally. The "type" field is internal only (not in the schema).

**Final decision:** User-facing is a direct zod union (raw string OR existing object). An internal discriminated `WeatherLocation` type normalizes both forms for type-safe controller code. The "type" field lives only in the internal type.

### Question: Should we add validation for the string form (e.g. min length, allowed characters)?

**Options considered:**

- **Min length 1 only** — trust Open-Meteo's geocoder as the source of truth for validity.
- **Strict length + charset** — reject obvious bad input.

**User choice:** Min length 1 only. Recommended.

---

## Area 2: Ambiguous match (WX-08)

### Question: When Open-Meteo returns multiple matches for a city name, which one to pick?

**Options considered:**

- **First result, log alternatives** — trust Open-Meteo's relevance ranking.
- **Highest-population result** — stable for ambiguous queries like "Vigo" (Vigo, Spain has ~295k pop).
- **Smart country match when comma present** — if the query has a comma, try to match `country` or `admin1`. Otherwise first.

**User choice:** Smart country match when comma present.

**Rationale:** This matches the user's natural input style (`location: "Vigo, Spain"`). It avoids the wrong-Vigo problem without requiring the user to know population data. Falls back to first result for the no-comma case.

### Question: What display name to use after geocoding?

**Options considered:**

- **Open-Meteo's `name` + `country`** — so "Vigo" resolves to "Vigo, Spain" even if the user wrote "Vigo" alone.
- **Original query string** — keep the user's input as the display name.
- **Configurable via `display_name` field** — default to Open-Meteo's, allow override.

**User choice:** Use Open-Meteo's `name` + `country`. Recommended.

**Rationale:** Most users want to see where their weather is being reported, not their raw input. Cheap to add since the data is already in the geocoder response.

---

## Area 3: Geocoding timing (WX-08)

### Question: When should the geocoder be called relative to button lifecycle?

**Options considered:**

- **Eager on activate** — resolve coords before the first render. No loading state needed. Adds ~200-500ms to startup.
- **Lazy on first poll** — first render shows the existing 'init' snapshot. Geocoder runs on first `getSnapshot` call. Faster startup but a flicker of fake data.
- **Hybrid: status enum, 'locating' tile** — add `status: 'locating' | 'available' | 'unavailable'` to the snapshot.

**User choice:** Hybrid: status enum, 'locating' tile.

**Rationale:** User wants a polished UX. The status enum makes the state machine explicit and the renderer can show a "Locating…" tile during the brief geocode. This is also a structural improvement over the existing `available: boolean` shape.

### Question: How should the geocoder behave when the daemon restarts?

**Options considered:**

- **In-memory LRU only** — per WX-09. Daemon restart means re-geocoding once per unique city. Simple and matches the spec.
- **Persist cache to disk** — slightly faster cold start, more code.

**User choice:** In-memory LRU only. Recommended.

---

## Area 4: Page cycle (WX2-01)

### Question: Where should the new 2-day forecast page sit in the cycle?

**Options considered:**

- **main → data → forecast → daily-forecast** — append after the existing hourly forecast.
- **main → daily-forecast → data → forecast** — put daily forecast right after main for faster access.
- **main → daily-forecast → forecast → data** — reorder so data is the deep-dive.

**User choice:** main → data → forecast → daily-forecast. Recommended.

**Rationale:** Most natural extension. Doesn't disrupt existing user muscle memory.

### Question: Should we rename the existing hourly 'forecast' page to avoid confusion?

**Options considered:**

- **Rename to 'hourly-forecast'** — disambiguates the new 'daily-forecast' page.
- **Keep 'forecast' name** — some naming awkwardness but no changes to the existing page.

**User choice:** Rename to 'hourly-forecast'. Recommended.

**Rationale:** Self-documenting cycle. The rename is internal (the `SurfacePage` enum); no user config references the page identifier, so this is safe.

### Question: Should the 30s auto-return to main page apply to the new daily-forecast page too?

**Options considered:**

- **Apply 30s auto-return** — consistent with the rest of the cycle.
- **No auto-return on daily-forecast** — different from other pages.

**User choice:** Apply 30s auto-return. Recommended.

---

## Decisions delegated to agent's discretion

- The internal location of the LRU cache (module-level singleton vs. addon-private).
- The HTTP client implementation for the geocoder (suggested: thin `fetch` wrapper with 5s timeout and a single retry on network error).
- The exact column layout, font sizes, and spacing of the new `daily-forecast` page within the existing `Surface` design system.
- The day-of-week label format.
- The exact text of the "Locating…" and "Location not found" tiles.
- The precipitation display format (raw mm vs. rounded).
- The exact commit that renames `forecast` → `hourly-forecast` (do it in the same commit as the new `daily-forecast` page; no `forecast` alias).

## Deferred ideas (out of phase scope)

- Persist geocoder cache to disk (in-memory only per WX-09).
- Save resolved coordinates back to the user's config (explicit anti-feature).
- 7-day or 14-day daily forecast (future candidate).
- City autocomplete dropdown (explicit anti-feature).
- Configurable fallback chain geocode → IP (no fallback per WX-10).
- Per-button geocoder cache (process-wide cache gains nothing different).
- "Show alternative matches" tile when geocoding returns multiple results.

---

*Discussion logged: 2026-06-08*
*Audit only — not for downstream consumption.*
