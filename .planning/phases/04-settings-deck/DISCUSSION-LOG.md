# Discussion Log — Phase 4: Settings Deck

## Topics Discussed

1. **Brightness target**
   - Option A: Stream Deck device brightness (recommended)
   - Option B: Monitor brightness
   - **Decision:** A — the feature is about controlling the Stream Deck screen.

2. **Emulator brightness state**
   - Option A: Runtime state + pub/sub channel (recommended)
   - Option B: Addon store
   - **Decision:** A — keep state close to the runtime/output client and broadcast via channel.

3. **Progress surface behavior**
   - Option A: Show on tap and auto-hide (recommended)
   - Option B: Persistent while adjusting
   - **Decision:** A — show feedback briefly, then dismiss.

4. **App logo source**
   - Option A: Built-in icon (recommended)
   - Option B: Theme asset
   - **Decision:** A — use a built-in icon to avoid theme dependency.

## Outcome

Proceed with plan-phase using the recommended options.
