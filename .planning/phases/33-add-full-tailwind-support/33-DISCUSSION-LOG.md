---
phase: 33
slug: add-full-tailwind-support
areas_discussed:
  - Adoption model
  - Theme token bridge
  - Authoring and scan boundary
  - Runtime delivery model
created: 2026-06-02
---

# Phase 33: Add full tailwind support - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 33-add-full-tailwind-support
**Areas discussed:** Adoption model, Theme token bridge, Authoring and scan boundary, Runtime delivery model

---

## Adoption model

### Tailwind meaning

| Option | Description | Selected |
|--------|-------------|----------|
| Real Tailwind integration | Adopt actual Tailwind tooling for the browser-rendered surface and stop treating the handwritten utility sheet as primary. | ✓ |
| Keep Sireno-owned utilities | Expand the existing runtime stylesheet instead of adding Tailwind. | |
| Hybrid compatibility layer | Keep the current stylesheet as core and add selective Tailwind compatibility on top. | |

**User's choice:** `Real Tailwind integration (Recommended)`
**Notes:** User accepted that full support should mean real Tailwind, not a bigger handcrafted clone.

### Canonical utility source

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind becomes canonical | Tailwind-generated CSS becomes the main utility layer; Sireno keeps only product-specific glue. | ✓ |
| Parallel utility systems | Keep the handwritten Sireno utility sheet alongside Tailwind long-term. | |
| Tailwind only for addons | Use Tailwind only for addon/theme authoring while core stays on the handwritten layer. | |

**User's choice:** `Tailwind becomes canonical (Recommended)`
**Notes:** User chose a clean canonical source instead of long-term parallel styling systems.

### Migration cutover

| Option | Description | Selected |
|--------|-------------|----------|
| Hard cut for core UI | Shared UI and built-ins move onto canonical Tailwind utilities in this phase. | ✓ |
| Soft migration | Land infrastructure now and keep old handwritten classes working for a while. | |
| Only new code uses Tailwind | Existing built-ins/shared UI stay as-is. | |

**User's choice:** `Hard cut for core UI (Recommended)`
**Notes:** User aligned with the repo's recent hard-cut cleanup phases.

### Tooling scope

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full tooling contract | Include Tailwind config, content scanning, build integration, and honest watch behavior. | ✓ |
| No, runtime CSS only | Ship generated CSS but keep the toolchain mostly hidden or ad hoc. | |
| Minimal tooling now | Add just enough to generate CSS and defer dev-loop truth. | |

**User's choice:** `Yes, full tooling contract (Recommended)`
**Notes:** User wants truthful Tailwind authoring, not just emitted CSS artifacts.

---

## Theme token bridge

### Theme source of truth

| Option | Description | Selected |
|--------|-------------|----------|
| Sireno theme stays authoritative | Tailwind resolves through the already-resolved Sireno theme contract. | ✓ |
| Tailwind theme becomes authoritative | Move canonical color/typography ownership into Tailwind config. | |
| Dual source of truth | Keep Sireno and Tailwind theme contracts side by side. | |

**User's choice:** `Sireno theme stays authoritative (Recommended)`
**Notes:** Preserves the Phase 19 precedence and browser-theme contract.

### Token exposure breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Expose the full resolved Sireno theme | Map the full live browser theme contract into Tailwind-usable tokens/utilities. | ✓ |
| Colors only | Bridge only colors first. | |
| Minimal curated subset | Expose only a small sanctioned subset. | |

**User's choice:** `Expose the full resolved Sireno theme (Recommended)`
**Notes:** User kept the bridge broad and aligned with the current CSS-variable export direction.

### Tailwind extensibility boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Constrain shipped surfaces to Sireno tokens | Tailwind is available, but shipped browser theming still styles against Sireno tokens for colors/typography. | ✓ |
| Allow arbitrary Tailwind theming | Addon/theme authors may extend Tailwind theme values freely. | |
| Core constrained, addons free | Core stays constrained, addons may define independent theme values. | |

**User's choice:** `Constrain shipped surfaces to Sireno tokens (Recommended)`
**Notes:** User wants Tailwind without creating a second color/type theming system.

---

## Authoring and scan boundary

### Content boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Built-ins, themes, and local addons | Support core/shared UI, built-in addons, theme TSX, and local addon folders in normal development. | ✓ |
| Core and built-ins only | Only scan shipped repo code. | |
| Everything including installed packages | Try to support all addon package locations too. | |

**User's choice:** `Built-ins, themes, and local addons (Recommended)`
**Notes:** This was treated as the honest first-class in-workspace boundary; installed npm addons were left out of first-pass guarantees.

### Dynamic class authoring rule

| Option | Description | Selected |
|--------|-------------|----------|
| Static class strings only | Canonical authoring uses statically discoverable classes plus explicit safelists where needed. | |
| Allow moderate dynamic generation | Permit small template-string variants with safelists/regex help. | |
| Allow arbitrary dynamic classes | Authors may generate Tailwind classes freely at runtime. | |

**User's choice:** `Allow arbitrary dynamic classes`
**Notes:** This answer was challenged because Tailwind's truthful contract is static extraction plus bounded safelists, and the repo does not have a runtime Tailwind compiler.

### Dynamic support model follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime compiler/evaluator | Generate CSS for dynamic classes on demand at runtime. | |
| Predeclared safelist generation | Support dynamic patterns only through an explicit config/helper/safelist contract. | ✓ |
| Best-effort regex scanning | Infer dynamic classes from source patterns automatically. | |
| I meant arbitrary values, not arbitrary discovery | Allow arbitrary-value syntax while still requiring static class strings. | |

**User's choice:** `Predeclared safelist generation (Recommended)`
**Notes:** User clarified that dynamic needs should be handled honestly through a bounded safelist-generation contract rather than magical runtime discovery.

### Addon participation model

| Option | Description | Selected |
|--------|-------------|----------|
| Participate in the workspace contract | Local addon/theme source joins the shared Tailwind scanning/watch paths. | ✓ |
| Core auto-detects everything | CLI discovers arbitrary local addon/theme sources at runtime and folds them into Tailwind compilation automatically. | |
| Repo code only, addons opt out | Only repo-owned code gets first-class Tailwind support. | |

**User's choice:** `Participate in the workspace contract (Recommended)`
**Notes:** User preferred the existing truthful workspace/watch model over runtime auto-discovery magic.

---

## Runtime delivery model

### CSS delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Prebuilt stylesheet asset | Generate Tailwind CSS ahead of runtime and inject/load the built asset from the browser document. | ✓ |
| Generate during CLI startup | Compile Tailwind CSS on app start, then inject it. | |
| Hybrid | Use a prebuilt base stylesheet plus runtime-generated additions. | |

**User's choice:** `Prebuilt stylesheet asset (Recommended)`
**Notes:** User chose the delivery model that best fits the CLI/browser architecture.

### Residual Sireno CSS

| Option | Description | Selected |
|--------|-------------|----------|
| Only product-specific glue | Keep theme vars, rich-text helpers, shrink-fit, marquee, and similar runtime-only rules in Sireno-owned CSS. | ✓ |
| Theme vars plus many compatibility utilities | Keep a broad compatibility layer after Tailwind lands. | |
| Almost nothing | Push nearly everything into Tailwind, even awkward runtime behaviors. | |

**User's choice:** `Only product-specific glue (Recommended)`
**Notes:** User chose a clean split where generic utilities move to Tailwind and Sireno keeps only product-specific behavior.

### Watch behavior

| Option | Description | Selected |
|--------|-------------|----------|
| cli:dev stays truthful | Tailwind config/content changes must be reflected through the normal `pnpm cli:dev` workflow. | ✓ |
| Manual rebuild is acceptable | Authors rebuild Tailwind assets separately. | |
| Only production build is truthful | Tailwind is reliable only in shipped builds. | |

**User's choice:** `cli:dev stays truthful (Recommended)`
**Notes:** User wants the normal dev loop to remain the honest authoring seam.

---

## Agent's Discretion

- Exact Tailwind config/module layout.
- Exact safelist-generation mechanism for bounded dynamic class needs.
- Exact build/watch orchestration behind the truthful `pnpm cli:dev` contract.
- Exact migration sequencing for removing generic utilities from `packages/cli/src/render/theme-utilities.ts` while keeping the cutover reviewable.

## Deferred Ideas

- First-class Tailwind scanning/support for arbitrary installed npm addon package trees outside the workspace contract.
- Runtime compilation of arbitrary dynamic utility strings.
- Replacing Sireno-owned theme precedence with a Tailwind-owned theme system.

---

*Phase: 33-add-full-tailwind-support*
*Discussion log generated: 2026-06-02*
