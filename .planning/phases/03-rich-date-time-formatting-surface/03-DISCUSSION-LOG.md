---
phase: 3
slug: rich-date-time-formatting-surface
areas_discussed:
  - Grammar shape
  - Render model
  - Blink behavior
  - Error handling
created: 2026-05-29
---

# Phase 3: Rich Date-Time Formatting Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 03-rich-date-time-formatting-surface
**Areas discussed:** Grammar shape, Render model, Blink behavior, Error handling

---

## Grammar shape

| Option | Description | Selected |
|--------|-------------|----------|
| Flat bounded grammar | Keep Phase 3 to a small non-nesting date-time-only grammar. | |
| Limited nesting | Allow some nesting without a broader markup language. | |
| Mini markup language | Allow nesting through a stricter markup model. | ✓ |

**User's choice:** `Mini markup language`
**Notes:** This choice materially changed the original Phase 3 scope and forced a second `discuss-phase 3` pass. The final re-scoped interpretation became a shared `Text` mini markup language, not a date-time-only formatter.

### Scope Boundary Follow-Up

| Option | Description | Selected |
|--------|-------------|----------|
| Lock bounded grammar | Keep the original narrower roadmap boundary and defer broader markup. | |
| Stop and re-scope milestone | Halt and re-run discussion under the broader scope. | ✓ |

**User's choice:** `Stop and re-scope milestone`
**Notes:** The original discuss run was stopped truthfully because the requested scope no longer matched the current roadmap/requirements wording.

### Parse Order

| Option | Description | Selected |
|--------|-------------|----------|
| Day.js first, Text parses after | `date-time` expands tokens first, then shared `Text` parses markup. | ✓ |
| Text parses before Day.js | Parse markup first, then try to preserve date tokens inside it. | |
| One combined parser | Make one parser understand both Day.js tokens and markup together. | |

**User's choice:** `Day.js first, Text parses after (Recommended)`
**Notes:** This keeps responsibilities cleanly split between date token formatting and shared text markup parsing.

### Shared Text Activation

| Option | Description | Selected |
|--------|-------------|----------|
| Opt-in prop | Existing `Text` stays literal unless a dedicated prop enables markup parsing. | |
| Always parse strings | Every string child gets parsed automatically. | ✓ |
| Separate RichText component | Keep `Text` literal and introduce a sibling markup-aware surface. | |

**User's choice:** `Always parse strings`
**Notes:** I pushed back twice because this silently changes every existing literal `Text` string surface in the repo. The user kept the always-on choice.

### Color Tags

| Option | Description | Selected |
|--------|-------------|----------|
| Existing tone tokens only | Reuse `<foreground>`, `<primary>`, `<accent>`, `<success>`, `<danger>`. | ✓ |
| Only accent and danger | Support only the newly requested color tags. | |
| Arbitrary color names | Allow a wider vocabulary beyond existing shared tones. | |

**User's choice:** `Existing tone tokens only (Recommended)`
**Notes:** This reuses the already-shipped shared tone contract instead of inventing a second color language.

### Nesting Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist + proper nesting | Only approved tags may nest, and they must be properly closed/nested. | ✓ |
| Loose nesting | Allow malformed overlap and recover aggressively. | |
| Unlimited extensible tree | Treat the grammar as a broadly extensible markup AST. | |

**User's choice:** `Whitelist + proper nesting (Recommended)`
**Notes:** This keeps the mini markup language bounded even after allowing nesting.

### Size Tag Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Text sizes only | Reuse the shared `Text` size vocabulary for inline size tags. | ✓ |
| Custom markup-only sizes | Introduce a separate inline size vocabulary. | |
| Arbitrary numeric sizes | Allow freeform size values. | |

**User's choice:** `Shared Text sizes only (Recommended)`
**Notes:** Captured from the earlier grammar discussion before the re-scope halt and kept compatible with the new shared `Text` direction.

### Highlight Shorthand

| Option | Description | Selected |
|--------|-------------|----------|
| Accent + bold only | `*...*` becomes accent-colored bold text only. | ✓ |
| Bold only | Treat the shorthand as weight-only. | |
| Arbitrary emphasis semantics | Let shorthand mean different things by context/theme. | |

**User's choice:** `Accent + bold only (Recommended)`
**Notes:** Captured from the earlier grammar discussion and still consistent with the re-scoped shared tone model.

---

## Render model

| Option | Description | Selected |
|--------|-------------|----------|
| Core Text owns parse+render | Shared `Text` parses the string and renders the nested output. | ✓ |
| Date-time owns render tree | `date-time` parses and builds the nested output itself. | |
| Theme wrapper participates | Theme presentation hooks influence or transform the parse/render tree. | |

**User's choice:** `Core Text owns parse+render (Recommended)`
**Notes:** This keeps one semantic source of truth and prevents date-time/themes from drifting into competing markup engines.

### Parser Output

| Option | Description | Selected |
|--------|-------------|----------|
| Small internal AST | Parse to a tiny internal semantic tree, then render it. | ✓ |
| Direct React nodes | Parse straight to elements without an intermediate structure. | |
| String rewriting only | Rewrite markup into flat chunks without a real tree. | |

**User's choice:** `Small internal AST (Recommended)`
**Notes:** This was chosen to keep nesting validation and render composition explicit.

### Line Break Model

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit line-split token | `|` becomes a structural line token in the parser/render tree. | ✓ |
| Literal text first, CSS later | Keep `|` in the string and reinterpret it later. | |
| Date-time only special case | Let only date-time own `|`. | |

**User's choice:** `Explicit line-split token (Recommended)`
**Notes:** This keeps line semantics inside the shared parser rather than as a date-time special case.

### Theme Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Same top-level metadata only | Themes still observe only outer `Text` metadata. | ✓ |
| Expose full parsed tree | Theme wrappers receive the internal AST. | |
| Theme-specific inner hooks | Add new theme hooks for rich-markup segments. | |

**User's choice:** `Same top-level metadata only (Recommended)`
**Notes:** This preserves the already-established presentation-only theme boundary.

---

## Blink behavior

| Option | Description | Selected |
|--------|-------------|----------|
| CSS animation only | Render blink as markup + CSS, no JS timers. | ✓ |
| JS timer-driven blinking | Toggle blink state with runtime timers. | |
| Date-time-only blink logic | Keep blink special-cased inside date-time. | |

**User's choice:** `CSS animation only (Recommended)`
**Notes:** This keeps blink declarative and parser-owned rather than runtime-timer-driven.

### Reduced Motion

| Option | Description | Selected |
|--------|-------------|----------|
| Disable blink, keep visible | Stop animation under reduced motion while keeping content readable. | |
| Slow it down | Keep blink under reduced motion but reduce frequency. | |
| Always blink | Ignore reduced-motion preference. | ✓ |

**User's choice:** `Always blink`
**Notes:** I explicitly disagreed and recommended disabling blink under reduced motion, but the user chose to keep blink active.

### Blink Nesting

| Option | Description | Selected |
|--------|-------------|----------|
| Compose with other tags | Blink can wrap or be wrapped by other whitelisted tags. | ✓ |
| Blink must be outermost | Only allow blink at the outer edge. | |
| Blink cannot nest with others | Treat blink as mutually exclusive. | |

**User's choice:** `Compose with other tags (Recommended)`
**Notes:** This matches the AST-based render model.

### Blink Scope

| Option | Description | Selected |
|--------|-------------|----------|
| No extra controls | Only `<blink>...</blink>` in Phase 3. | ✓ |
| One global speed setting | Add one project-level blink tuning knob. | |
| Per-tag timing controls | Support speed/duty-cycle attributes. | |

**User's choice:** `No extra controls (Recommended)`
**Notes:** Keeps Phase 3 blink support intentionally narrow.

---

## Error handling

| Option | Description | Selected |
|--------|-------------|----------|
| Literal fallback | Render the original source text literally on parser failure. | ✓ |
| Best-effort recovery | Try to repair malformed markup. | |
| Drop invalid parts | Silently remove broken segments. | |

**User's choice:** `Literal fallback (Recommended)`
**Notes:** This was the initial preferred failure mode for malformed or mismatched markup.

### Unknown Tags

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as invalid markup | Unknown tags make the markup invalid. | |
| Render unknown tags literally | Ignore only unknown tags and keep parsing the rest. | |
| Map loosely by name | Coerce unknown tags to known semantics. | |

**User's choice:** `ignore them`
**Notes:** This answer conflicted with the later desire for literal fallback and clear invalid-markup handling, so it was pressure-tested in a follow-up question.

### Error Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Keep original text visible | Show exact source text including markers on failure. | |
| Show partial formatting | Render valid pieces and leave invalid parts literal. | |
| Hide formatting markers | Strip markers and render plain text when parsing failed. | |

**User's choice:** `Hide formatting markers`
**Notes:** This also conflicted with the earlier literal-fallback direction and was resolved by the final consistency choice below.

### Unsupported Combinations

| Option | Description | Selected |
|--------|-------------|----------|
| Reject structural + unsupported combos | Invalid structure or unsupported combinations fail. | ✓ |
| Reject structural errors only | Only malformed structure fails. | |
| Allow everything structurally valid | Render any properly nested combination somehow. | |

**User's choice:** `Reject structural + unsupported combos (Recommended)`
**Notes:** Keeps the whitelist explicit instead of letting valid-looking but unsupported combinations slip through.

### Error Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Literal fallback for any invalid markup | Unknown tags, malformed structure, or unsupported combinations all render the original source literally. | ✓ |
| Ignore unknown tags, fallback on structural errors | Mixed failure modes depending on error type. | |
| Strip markers on failure | Remove formatting markers when invalid. | |

**User's choice:** `Literal fallback for any invalid markup (Recommended)`
**Notes:** This resolved the earlier contradictory answers into one deterministic rule for downstream planning.

---

## Agent's Discretion

- Exact parser/helper placement inside shared `Text`.
- Exact internal AST node types and render helpers.
- Exact DOM structure for multi-line and nested rendered output.
- Exact test/fixture coverage needed to prove literal fallback and shared `Text` adoption honestly.

## Deferred Ideas

- Arbitrary HTML or Markdown support.
- Arbitrary color names beyond the existing shared tone tokens.
- Per-tag blink timing controls.
- Theme-owned inner markup hooks.
- A separate `RichText` component instead of shared `Text` ownership.

---

*Phase: 03-rich-date-time-formatting-surface*
*Discussion log generated: 2026-05-29*
