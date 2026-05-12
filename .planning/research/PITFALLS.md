# Pitfalls Research

**Domain:** Stream Deck management CLI + addon system
**Researched:** 2026-05-12
**Confidence:** HIGH

## Common Mistakes

| # | Mistake | Severity | Frequency | Impact |
|---|---------|----------|-----------|--------|
| 1 | Ignoring Linux udev rules for HID access | CRITICAL | High | Device completely invisible to the CLI; user sees "no device found" with no actionable error |
| 2 | Device disconnect/reconnect not handled | HIGH | High | CLI crashes on unplug; requires manual restart; addon state corrupted |
| 3 | Polling too aggressively causing device USB bandwidth saturation | HIGH | Medium | Button updates become visibly laggy; USB bus contention affects other peripherals |
| 4 | Resolving addon dependencies at load time without clear error boundaries | HIGH | Medium | A single broken addon crashes the entire CLI; user cannot isolate the problem |
| 5 | React reconciler memory leaks from unmounted button components | MEDIUM | Medium | Memory grows over time; long-running CLI sessions crash after hours |
| 6 | Blocking the main thread with synchronous image processing | MEDIUM | Medium | Button tap responsiveness degrades; user perceives lag |
| 7 | Config YAML errors producing cryptic stack traces | MEDIUM | High | User cannot debug their config; frustration with hand-edited YAML model |
| 8 | Addon API breaking changes without versioning | LOW | High | Addon ecosystem unstable; every CLI release breaks existing addons |
| 9 | Not distinguishing between tap, double-tap, and hold gestures correctly | LOW | Medium | Gesture misclassification leads to wrong actions; user confusion |
| 10 | Assuming all systems provide CPU temp/fan speed readings | LOW | Low | Built-in buttons silently fail on some hardware; "works on my machine" bug |

### Mistake Details

**1. Linux udev rules for HID access**
- **What happens:** On Linux, the Stream Deck USB device is owned by root by default. Without a udev rule granting user access, `@elgato-stream-deck/node` cannot open the HID device. The error message from node-hid is unhelpful ("cannot open device").
- **Why it happens:** Linux USB security model; HID devices require explicit permission rules.
- **Example:** User installs sireno-deck, runs `sireno start`, and sees "No Stream Deck devices found" despite the device being plugged in. The udev rules from the `@elgato-stream-deck` README are not installed.
- **Fix cost:** LOW — install the udev rules file. But high user frustration if not documented/detected.

**2. Device disconnect/reconnect not handled**
- **What happens:** User unplugs the Stream Deck; the CLI process crashes with an unhandled HID error or continues running but renders to nothing. On reconnect, the process doesn't detect the device.
- **Why it happens:** The HID connection is a long-lived handle; disconnection emits an error event that must be caught. Reconnection requires full device re-initialization including button re-rendering.
- **Example:** User moves their laptop, Stream Deck cable disconnects momentarily. CLI process is now a zombie consuming CPU but doing nothing.
- **Fix cost:** MEDIUM — requires connection state machine, reconnection retries, and full state restoration.

**3. Polling too aggressively**
- **What happens:** Every button polling at 200ms with many buttons saturates the USB HID bus. The Stream Deck hardware can only accept limited write throughput per second.
- **Why it happens:** The 500ms default is sensible, but if multiple live widgets all fire simultaneously in sync, the burst of writes can overwhelm the device.
- **Example:** 15 buttons all configured with 500ms updates, all firing on the same interval boundary. Device shows stuttering updates.
- **Fix cost:** MEDIUM — implement staggered scheduling with jitter, batch updates per frame, and throttle writes to the device.

**4. Broken addon crashes the CLI**
- **What happens:** An addon's module throws during import (syntax error, missing dependency, runtime error). The entire CLI crashes because the addon loading happens at startup.
- **Why it happens:** Dynamic `import()` throws if the module has errors; if the addon loader doesn't catch per-addon, one failure crashes everything.
- **Example:** User installs a third-party addon with an import of a missing npm package. The CLI won't start until they remove or fix that addon.
- **Fix cost:** LOW — wrap each addon `import()` in try/catch; log the error and skip the broken addon; continue loading others.

**5. React reconciler memory leaks**
- **What happens:** The custom reconciler creates image buffers on each render but doesn't release old ones. Or component subscriptions (state polling, event listeners) aren't cleaned up when a button is removed or deck changes.
- **Why it happens:** Custom reconciler host configs must implement cleanup hooks; forgetting `commitUpdate` buffer cleanup or component `useEffect` cleanup causes leaks.
- **Example:** User navigates between decks rapidly. Each deck change creates new button components but old polling intervals keep running. After a day, memory usage is 500MB+.
- **Fix cost:** MEDIUM — requires careful reconciler host config implementation and mandatory cleanup patterns.

## Warning Signs

Early indicators that a project is heading toward common pitfalls:

| Warning Sign | Indicates | Action |
|-------------|-----------|--------|
| "No device found" on Linux but `lsusb` shows it | Missing udev rules (Mistake #1) | Document udev setup in the CLI `start` error message; provide `sireno setup-udev` command |
| CLI silently hangs after device unplug | Disconnect not handled (Mistake #2) | Implement device connection state machine with reconnection retries |
| Button images flicker or update out of order | Polling saturation (Mistake #3) | Add staggered scheduling with jitter; implement update batching per frame |
| `sireno start` crashes with a stack trace mentioning an addon module | Broken addon not isolated (Mistake #4) | Wrap each addon load in error boundary; log and skip broken addons |
| Memory grows linearly over hours of runtime | Reconciler leaks (Mistake #5) | Audit reconciler host config for missing cleanup; add memory monitoring |
| Config parse errors show raw YAML parser exceptions | Poor error reporting (Mistake #7) | Catch YAML parse errors and map them to friendly messages with line numbers |
| Double-tap triggers two single-tap actions | Gesture misclassification (Mistake #9) | Implement proper debounce with tap vs double-tap timeout |

## Prevention Strategies

Proactive measures to avoid the mistakes above:

| Strategy | Prevents | When to Apply | How |
|----------|----------|---------------|-----|
| Udev rule detection and setup | #1 | During `sireno start` on Linux | Check if Stream Deck is visible via lsusb but not via HID; if so, print a clear error with udev setup instructions |
| Connection state machine | #2 | During DeviceManager implementation | Track connection state: DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTED. On disconnect, clear device reference and attempt reconnect with exponential backoff |
| Staggered polling with jitter | #3 | During PollScheduler implementation | Add random jitter (±50ms) to each button's interval; batch all updates into a single frame write per device refresh cycle |
| Per-addon error boundaries | #4 | During AddonRegistry implementation | `try { await import(addonPath) } catch (e) { logger.error(...); continue }` — never let one addon crash the whole load |
| Reconciler cleanup audit | #5 | During reconciler host config implementation | Implement `commitUpdate` to release old buffers; enforce cleanup in host config `removeChild`; test with rapid deck switching |
| Async image processing pipeline | #6 | During ImageOutput implementation | Use sharp's async API (Promise-based); never call sharp synchronously; queue renders with a concurrency limit |
| Friendly YAML error mapping | #7 | During ConfigLoader implementation | Catch `YAMLException` from js-yaml; map to user-friendly messages showing file path, line number, and suggestion |
| Addon API versioning from day one | #8 | During addon type interface design | Define `AddonAPI` interface with an explicit `apiVersion: number`; addon manifest must declare `apiVersion`; reject mismatched versions |
| Proper gesture detection | #9 | During device event handling | Implement tap (down+up < 300ms), double-tap (two taps < 400ms apart), hold (down > 500ms); block single-tap during double-tap window |
| Graceful degradation for missing sensors | #10 | During built-in button implementation | Each sensor reading wrapped in try/catch; show "N/A" or fallback display instead of error on button |

## Domain-Specific Patterns

### Patterns That Look Right But Aren't

| Pattern | Why It Seems Good | Actual Problem | Better Approach |
|---------|-------------------|----------------|-----------------|
| One reconciler instance per button | Natural React mental model: each component has its own reconciler | Inefficient; each reconciler creates its own fiber tree and scheduling overhead. The host config also manages device connection per reconciler | Single reconciler instance with one root; all buttons are children of the root; React handles diffing efficiently |
| Render on every poll interval regardless of change | Simplest: always re-render, always write to device | Wastes CPU and USB bandwidth rewriting identical images; causes visual flicker | Compare rendered buffer with previous; only write if content changed (memoization at the buffer level) |
| JSON config format (instead of YAML) | Easier to parse, built-in to Node.js | Harder for humans to edit; YAML is more readable for configuration with comments and references | YAML with js-yaml; the readability matters because users hand-edit config |
| Storing addon state in addon module globals | Simplest; no state management library needed | Module globals leak between deck changes; addon state persists when it shouldn't; hard to reset | Each button instance gets its own state object; passed to the React component as props; reset on deck change |
| Using os.loadavg() for CPU display | Built-in, no dependencies | loadavg is a system load metric (1/5/15 min), not current CPU utilization; misleading for button display | Use `systeminformation.currentLoad()` which provides per-core and aggregate CPU % |

### Patterns That Look Wrong But Work

| Pattern | Why It Seems Bad | Why It Actually Works | When to Use |
|---------|------------------|----------------------|-------------|
| Polling instead of events for button state | Polling wastes CPU; event-driven is more efficient | Stream Deck updates are visual (~500ms refresh is fine); polling is simpler and avoids missing edge-triggered events; consistent load is easier to reason about than bursty events | External state tracking (media player, system stats) where native events aren't available |
| Single-process trusted addons | Security risk; addons can crash the main process | Simplifies the addon model enormously; enables direct React component sharing; crash-on-error is acceptable for personal use; the addon API can be versioned and stabilized before sandboxing | Personal/hobbyist tools where trust exists; can add sandboxing later |
| Using React in a headless CLI app | React is for browsers; unnecessary overhead | React's component model and state management are excellent for UI composition even without a DOM; react-reconciler was designed for custom renderers; the developer experience and addon ecosystem benefit from React's familiar API | When rendering to bitmaps/screens rather than DOM; custom renderers |

---
*Pitfalls research for: Stream Deck CLI management tool*
*Researched: 2026-05-12*
