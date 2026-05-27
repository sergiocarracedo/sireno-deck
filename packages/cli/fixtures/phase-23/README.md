# Phase 23 Review Notes

## Local Raw-Source Addon

`local-raw-addon/` is the committed proof that `sirenoAddon.main` may point at raw local `.tsx` source while addon authoring still imports from the `sireno-deck-cli` root export only.

Phase 28 hardens that proof around the component-first surface: the fixture now uses the mounted `render(props)` authoring seam together with the root-exported `ButtonSurface`, `Icon`, `Chip`, and `Text` kit instead of helper-factory rendering.

Treat this fixture as the canonical raw-source authoring story for the repo:

```tsx
import { ButtonSurface, Chip, Icon, Text, defineMountedButton } from "sireno-deck-cli"
```

If docs or examples drift away from that component-first contract, this fixture is the executable correction.

## Hardware Startup Placeholder

Phase 23 also adds a temporary branded hardware placeholder that is written before browser startup and cleared by the first successful real deck render.

To review the placeholder on a visibly delayed startup path:

1. Run the normal CLI startup against hardware.
2. Temporarily add a short delay in the browser-renderer startup path before the first capture completes.
3. Confirm the deck shows the branded `SIRENO / STARTING` placeholder immediately.
4. Confirm the placeholder disappears on the first real render.
5. Confirm a startup failure clears the placeholder instead of leaving a fake-ready screen behind.
