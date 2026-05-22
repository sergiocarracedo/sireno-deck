# Phase 18 Discussion Log

**Date:** 2026-05-21
**Mode:** standard
**Phase:** 18 - React DOM-Based Renderer With HTML/CSS Surface Support

## Areas Discussed

### Renderer backend
- Options considered:
  - Persistent Playwright browser with one full-deck page
  - Persistent Puppeteer browser
  - DOM emulation / html-to-image style path
- Recommended:
  - Persistent Playwright browser with one full-deck page
- User discussion outcome:
  - User asked whether rendering should use one Playwright instance per button or for the full deck.
  - Decision: one persistent browser and one full-deck page; do not use one browser/page per button.

### Backend capture unit
- Options considered:
  - Full deck page
  - One page per button
  - Hybrid pages
- Recommended:
  - Full deck page
- User choice:
  - `Full deck page (Recommended)`

### Media behavior
- Options considered:
  - Snapshot sampling
  - First frame only
  - Best-effort continuous animation
- Recommended:
  - Snapshot sampling
- User choice:
  - `1`
- Captured rationale:
  - Allow browser-native media behavior, but keep device output bounded and sampled.

### Active-deck updates inside the page
- Options considered:
  - Patch active deck in place
  - Reload page per deck change
  - Separate long-lived page per deck
- Recommended:
  - Patch active deck in place
- User choice:
  - `1`

### Raster boundary
- Options considered:
  - Browser screenshot boundary
  - DOM to canvas boundary
  - Custom compositor boundary
- Recommended:
  - Browser screenshot boundary
- User choice:
  - `Browser screenshot boundary (Recommended)`

### Contract shape
- Initial options presented:
  - Keep current render contract
  - Extend contract a little
  - Introduce a new DOM-native contract
- User response:
  - Rejected the old `DeckButtonProps`-style approach as too complex and wrong for the new model.
  - Stated that the button should be a React component that gets context, button config, and methods, then returns HTML/CSS.
  - Stated that props like `accent`, `background`, `label`, and `variant` should be button-owned config, not core-standardized props.
  - Stated that `full_surface` is the obvious shared prop.

### 2026-05-22 contract clarification
- Options considered:
  - Buttons return React elements and `react-dom` renders them into browser HTML/CSS
  - Buttons return a custom DOM description
  - Buttons return raw HTML strings
- Recommended:
  - Buttons return React elements and `react-dom` renders them into browser HTML/CSS
- User choice:
  - `Buttons return React elements`
- Captured rationale:
  - The goal is HTML/CSS because that is what the browser understands, but `react-dom` should do the conversion from TSX so button authors do not deal with a custom DOM API.

### 2026-05-22 authoring surface
- Options considered:
  - Standard HTML + exported React components like `buttonFrame`
  - Custom intrinsic tags like `deck-button`
  - HTML only with no core composition components
- Recommended:
  - Standard HTML + exported React components like `buttonFrame`
- User choice:
  - `Standard HTML + React components`

### 2026-05-22 legacy helper boundary
- Options considered:
  - Replace helper-style authoring in Phase 18
  - Keep helper-style authoring as optional compatibility
  - Keep helper-style authoring as the primary API
- Recommended:
  - Replace helper-style authoring in Phase 18
- User choice:
  - `Replace it in Phase 18`

### Compatibility boundary
- Options considered:
  - Compatibility shim
  - Hard switch all at once
  - Dual contracts long-term
- Recommended:
  - Compatibility shim
- User choice:
  - `Hard switch all at once`

### Shared base behavior
- Options considered:
  - Core wrapper by default, `full_surface` opts out
  - Every button owns its full surface by default
  - Both patterns first-class
- Recommended:
  - Core wrapper by default, `full_surface` opts out
- User choice:
  - `1`
- Additional user requirement:
  - Shared base must be a React component and must be renamed to `buttonFrame`.

### `buttonFrame` composition
- Options considered:
  - Implicit default wrap + exported component
  - Explicit component only
  - Implicit only
- Recommended:
  - Implicit default wrap + exported component
- User choice:
  - `1`

### Startup/runtime posture
- Options considered:
  - Warm once, stay hot
  - Lazy start on first render
  - Cold render each time
- Recommended:
  - Warm once, stay hot
- User choice:
  - `1`

### Update recapture strategy
- Options considered:
  - Recapture full active deck, then crop keys
  - Recapture only affected key regions
  - Hybrid
- Recommended:
  - Recapture full active deck, then crop keys
- User choice:
  - `1`

### Backpressure strategy
- Options considered:
  - Coalesce to latest state
  - Process every update in order
  - Per-button priority rules
- Recommended:
  - Coalesce to latest state
- User choice:
  - `1`

## Agent's Discretion Areas

- Exact page/component tree used to host the deck in Chromium.
- Exact DOM patching strategy and screenshot/crop implementation details.
- Exact bounded media sampling defaults.

## Deferred Ideas

- Long-term dual contract support.
- Per-button page isolation.
- Best-effort continuous animation semantics.
- Richer update prioritization beyond latest-state coalescing.

## User Verbatim Signals

- "will we use one playwright instance per button? or the full deck?"
- "No, this should be simpler, the button is a react component, gets the context, the button config, and method, and returns html/css"
- "Other props like, accent, background, label, variant, etc is something each button will expose via config"
- "Obviously, `full_surface` is a common prop for all the buttons"
- "And remember shared base MUST be a react component (and rename it to `buttonFrame`"
- "i mean HTML/CSS because is what the browser understand, but react-dom do the job to convert the tsx to html and css"
