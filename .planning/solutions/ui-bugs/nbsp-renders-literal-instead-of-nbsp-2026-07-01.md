---
title: "&nbsp; renders as literal string instead of non-breaking space in date-time buttons"
date: 2026-07-01
category: ui-bugs
module: builtin-addons/date-time
problem_type: ui_bug
severity: medium
tags: [nbsp, non-breaking-space, format, date-time, expandTokens]
---

# &nbsp; renders as literal string instead of non-breaking space in date-time buttons

## Problem

Date-time buttons using the `big` variant format `<4xl>&nbsp;*HH*<blink>.</blink>|mm</4xl>`
displayed `&nbsp;` literally (the characters `&`, `n`, `b`, `s`, `p`, `;`) instead of
rendering a non-breaking space between the hours and minutes.

## Symptoms

- Time display shows `&nbsp;` as visible text between hours and minutes
- The `&nbsp;` entity appears as 6 plain characters, not a space
- Both Text.tsx parsing and format.ts token expansion were investigated

## What Didn't Work

Initially, the Text.tsx rich-text parser was modified to add an `nbsp` node type
that renders `\u00A0`. This handles direct rich-text content, but the date-time
buttons use `formatDigitalDateTimeLabel(format, now)` which returns a plain string
— the Text component then receives this string as children and treats it as plain
text (no rich parsing needed since there are no `<>` tags in the output).

## Solution

The root cause was in `format.ts`'s `expandTokens` function. It matches tokens by
length (4, 3, 2, 1 characters) against `TOKEN_MAP`. Since `&nbsp;` is 6 characters,
it never matched any entry, so each character passed through literally:

```typescript
// BEFORE — &nbsp; characters passed through literally
const expandTokens = (tokenString: string, date: Date): string => {
  let result = ""
  let i = 0
  while (i < tokenString.length) {
    let matched = false
    for (const len of [4, 3, 2, 1]) {
      const slice = tokenString.slice(i, i + len)
      const handler = TOKEN_MAP[slice]
      if (handler) {
        result += handler(date)
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      result += tokenString[i]  // ← each char of &nbsp; passes through here
      i += 1
    }
  }
  return result
}
```

Fixed by checking for `&nbsp;` as a special case before the token loop:

```typescript
// AFTER
const expandTokens = (tokenString: string, date: Date): string => {
  let result = ""
  let i = 0
  while (i < tokenString.length) {
    if (tokenString.slice(i, i + 6) === "&nbsp;") {
      result += "\u00A0"
      i += 6
      continue
    }
    // ... unchanged token matching loop
  }
}
```

## Why This Works

The `formatDigitalDateTimeLabel` pipeline splits on `<markup>` tags (like `<4xl>`,
`<blink>`) and passes the literal text portions to `expandTokens`. Any `&nbsp;`
in those literal portions is now decoded to the actual Unicode character before
being returned as the button label string. React then renders `\u00A0` as a
non-breaking space.

## Prevention

- When adding a new escape sequence or entity to a formatting pipeline,
  verify it works in isolation (unit test) and in context (integration test)
- The Text.tsx `nbsp` node type is correct for rich-text authored directly in
  JSX; `format.ts` handles a different pipeline (string formatting). Both needed
  the same fix applied in their respective layers
- Consider adding `&nbsp;` expansion to `expandTokens` test coverage in
  `format.test.ts`

## Related

- `packages/cli/src/builtin-addons/date-time/shared/format.ts` — `expandTokens`
- `packages/cli/src/builtin-addons/date-time/buttons/time/frontend.tsx` — `big` variant
- `packages/cli/src/ui/primitives/Text.tsx` — `nbsp` node type (separate pipeline)
