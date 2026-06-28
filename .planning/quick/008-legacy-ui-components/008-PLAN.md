---
quick_task: 008
description: port legacy rich Text component (markup parser, blink, tones, sizes, alignment)
autonomous: true
---

# Plan: Quick 008 — legacy UI components (Text + blink + date-time)

## Tasks

### Task 1: Port rich Text component

- File: `packages/cli/src/themes/default/components/Text.tsx`
- Replace with full legacy copy: add `parseRichText()` (markup parser for `<blink>`, `<accent>`, `<2xl>`, etc.), `renderRichTextNodes()`, `renderTextChildren()`.
- Tones: `fg` (was "foreground"), `muted`, `accent`, plus add `danger`, `primary`, `success` (mapped to theme CSS variables).
- Sizes: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `5xl`.
- `TRUNCATE_CLASS` → `fit` modes (wrap, ellipsis, shrink, hidden).
- `ALIGN_CLASS` → `text-center`, `text-left`, `text-right`.
- `TYPOGRAPHY_CLASS` → `font-mono` (already), `font-main` (default body), `font-aux` (secondary).
- Blink: `sireno-rich-text-blink` CSS class → add to theme CSS.

### Task 2: Add blink animation + font-aux to theme CSS

- File: `packages/cli/src/themes/default/theme.css`
- Add `@keyframes sireno-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }` and `.sireno-rich-text-blink { animation: sireno-blink 1s step-end infinite; }`.
- Add `--font-aux: ...;` font token.
- Same for `packages/cli/src/themes/light/theme.css`.

### Task 3: Update date-time frontend to use rich Text

- File: `packages/cli/src/builtin-addons/date-time/frontend.tsx`
- Replace the hardcoded formatting spans with `<Text size="lg" tone="fg">{formatTime(now, false)}</Text>`.
- Add `import { Text } from "@/themes/default/components/Text.tsx";` (or via the theme's manifest).
- The `core:date-time` button with `config.format` uses the rich markup format.

## Acceptance

- `pnpm test` passes.
- Browser: date-time buttons show properly formatted time/date using the legacy markup pattern.
- CSS blink animation present in the theme.
- `font-aux` variable added to both themes.
