# Feature Research

**Domain:** v1.2 session context and surface composition
**Researched:** 2026-05-17
**Confidence:** HIGH

## Table Stakes

Features the milestone should deliver so the requested scope feels like one coherent release instead of six unrelated hacks.

| Feature | Why Expected In This Milestone | Complexity | Notes |
|---------|-------------------------------|------------|-------|
| Background fallback layering | The user explicitly defined precedence: config override, then deck, then theme | MEDIUM | Must be one shared rule across all visuals |
| OS context injection | OS type, variant, and version are now part of addon/runtime expectations | MEDIUM | Needs one authoritative context shape available in render, action/status paths, and config templating |
| Multiple text fitting modes | The current clip-only text contract is too narrow for this milestone | MEDIUM | Default should be shrink-then-clip; wrap should be opt-in |
| Lock-aware deck switching | Locked-session deck is part of user-visible behavior, not optional polish | HIGH | Requires runtime deck ownership and restore semantics |

## Differentiators

Features that make this milestone materially stronger than a background-and-config patch.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Global addon-provided wrappers/styles | Makes addon visuals reusable across the whole system, not trapped inside one addon | HIGH | Needs registry identity, validation, and render-surface integration |
| Built-in rich toggles | Standardizes a common UX pattern instead of leaving every addon to reinvent it badly | MEDIUM | Support both internal-state and command-driven variants |
| Lock idle dimming | Makes lock mode act like a real session-aware surface, not a static replacement deck | MEDIUM | Separate from lock detection; requires elapsed-time behavior |
| Config templating with injected OS/session context | Lets decks and generated content respond to host metadata before runtime render | HIGH | Needs safe, limited interpolation scope, not arbitrary code execution |

## Anti-Features

Features that sound adjacent but would bloat or poison this milestone.

| Feature | Why It Sounds Tempting | Why It’s Problematic | Better Alternative |
|---------|------------------------|----------------------|--------------------|
| Full cross-platform session management abstraction | The product supports multiple OSes | Lock-state detection semantics differ too much; Linux-first is safer than pretending parity exists | Build a narrow session-context service with explicit degraded support paths |
| CSS-like styling system for addons | “Styles” sounds like CSS | Far too broad for a custom reconciler + SVG renderer project | Register a narrow set of wrapper/style primitives the renderer actually understands |
| Arbitrary environment/process context injection | Feels powerful for templating | Expands security/surface area immediately | Limit v1.2 to OS type, variant, version, plus lock-state where needed by core |
| Automatic text fit with unlimited shrinking | Guarantees fit on paper | Produces unreadable keys | Minimum readable font size, then clip |
| Lock overlay on top of the active deck | Looks cheaper to implement | Confuses action suppression and restore semantics | Switch to a dedicated locked-session deck |

---
*Feature research for: v1.2 session context and surface composition*
*Researched: 2026-05-17*
