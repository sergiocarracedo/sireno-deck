---
plan: 03
phase: 09-post-v1-polish
title: Emulator side panel rework (5-page nav + bridge/service/addons/config pages + device-model swap fix)
wave: 2
depends_on: [02]
files_modified:
  - modified: packages/cli/emulator/src/App.tsx (route restructuring)
  - modified: packages/cli/emulator/src/Shell.tsx
  - modified: packages/cli/emulator/src/SidePanel.tsx (tabbed nav)
  - new: packages/cli/emulator/src/pages/DevicePage.tsx
  - new: packages/cli/emulator/src/pages/BridgeLogsPage.tsx
  - new: packages/cli/emulator/src/pages/ServiceLogsPage.tsx
  - new: packages/cli/emulator/src/pages/AddonsPage.tsx
  - new: packages/cli/emulator/src/pages/ConfigPage.tsx
  - new: packages/cli/emulator/src/__tests__/bridge-logs-page.test.tsx
  - new: packages/cli/emulator/src/__tests__/side-panel.test.tsx
objective: >
  Redo the emulator side panel as a 5-page tabbed nav via react-router routes:
  Device (default), Bridge Logs (ring buffer + 4 filters), Service Logs
  (Plan 02 ring buffer), Addons (enabled list + registered decks/buttons),
  Config (raw config.yml viewer). Fix the device-model swap bug: when the
  selector changes, the iframe reloads with the new key count. Demoable:
  launch emulator, navigate all 5 pages, change device model and watch
  the iframe re-render with the new key grid.
autonomous: true
single_layer_justified: false
must_haves:
  - "App.tsx: nested routes `/emulator/device|bridge-logs|service-logs|addons|config` redirect to `/emulator/device` on default."
  - "SidePanel.tsx: 5 tabs with react-router <NavLink>; active state visible."
  - "DevicePage.tsx: existing iframe + device selector; when device model changes, propagate via URL param (`?device=<id>`) and postMessage fallback to the iframe."
  - "BridgeLogsPage.tsx: reads bridge-log ring buffer (NEW store, not just service-log; needs another ring buffer for wsBridge messages in general) + filter UI (direction/channel/type/contentSubstring)."
  - "ServiceLogsPage.tsx: reads service-log ring buffer from Plan 02."
  - "AddonsPage.tsx: queries CLI for enabled addons + their decks/buttons. Use a new WS sub-message or fallback to listing builtin addons from a CLI endpoint (decision: read directly from the running CLI's addon registry via a new GET request to the existing HTTP server, OR derive from the deck-config broadcast)."
  - "ConfigPage.tsx: reads config.yml content. Add a new CLI endpoint `/config` to the http-server that returns the raw config text, then the page fetches it."
  - "Tests: bridge-logs-page (filter narrows results), side-panel (active tab highlighting)."
---

<tasks>

<task id="03.1">
  <file>packages/cli/emulator/src/bridge-log-store.ts</file>
  <action>Add a separate ring buffer for ALL wsBridge messages (not just service-log). Same cap (1000) + eviction pattern. New exports: `appendBridgeMessage(entry: { ts, direction: 'sent'|'received', type: string, channel: string | null, payload: unknown })`, `getBridgeMessages(filter?)`, `clearBridgeMessages()`. Store direction (sent/received) by tracking outgoing `send()` calls vs incoming `onMessage`.</action>
  <verify>rtk vitest run packages/cli/emulator/src/__tests__/bridge-logs-page.test.tsx (test file written in 03.7).</verify>
  <done>Bridge-message ring buffer exists.</done>
</task>

<task id="03.2">
  <file>packages/cli/emulator/src/bridge.ts</file>
  <action>Wire `appendBridgeMessage` into the existing `createWsClient` send + onMessage paths. Send path: wrap `send(message)` to call `appendBridgeMessage({direction:'sent', ...})` BEFORE the actual send. Receive path: call `appendBridgeMessage({direction:'received', ...})` after parsing. Extract channel from message.channel if present.</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit.</verify>
  <done>All messages stored regardless of active page.</done>
</task>

<task id="03.3">
  <file>packages/cli/emulator/src/App.tsx + Shell.tsx + SidePanel.tsx</file>
  <action>Restructure emulator routes: wrap existing emulator in a `<Routes>` block with nested routes. Add `<NavLink>`-based SidePanel with 5 entries. Default route `/` (or `/emulator/`) redirects to `/device`. Shell renders SidePanel + the active route's component. Keep existing Deck rendering as DevicePage's content.</action>
  <verify>Manual: launch emulator, navigate 5 pages, URL reflects active page.</verify>
  <done>5-page navigation works.</done>
</task>

<task id="03.4">
  <file>packages/cli/emulator/src/pages/BridgeLogsPage.tsx</file>
  <action>Read from `getBridgeMessages(filter)` (Plan 03.1). Filter UI: dropdown for direction, dropdown for channel (derived from seen channels), dropdown for type, content substring text input. Render a virtualized list of messages (ts + direction + type + payload preview). Color-code sent vs received (subtle).</action>
  <verify>rtk vitest run packages/cli/emulator/src/__tests__/bridge-logs-page.test.tsx (written in 03.7).</verify>
  <done>Bridge logs page functional.</done>
</task>

<task id="03.5">
  <file>packages/cli/emulator/src/pages/ServiceLogsPage.tsx + AddonsPage.tsx + ConfigPage.tsx</file>
  <action>ServiceLogsPage: read from `getServiceLogs()`; render with level-colored rows + ts + msg. AddonsPage: add a WS subscribe to a new 'addons-list' channel (or derive from deck-config surfaces — decision: derive from current surfaces since it avoids new protocol). ConfigPage: add new CLI endpoint `/config` to packages/cli/src/cli/http-server.ts that returns the raw config text; page fetches + renders in a <pre> block.</action>
  <verify>Manual smoke: each page renders.</verify>
  <done>3 pages functional.</done>
</task>

<task id="03.6">
  <file>packages/cli/emulator/src/pages/DevicePage.tsx (device-model fix)</file>
  <action>When device selector changes: update URL via `useSearchParams` (`?device=<id>`), then postMessage to the iframe with `{type: 'device-model-changed', device}` as fallback. The frontend already reads `__SIRENO_DEVICE_MODEL__` from window; we need to also update it via postMessage handler in frontend/src/App.tsx (extend the useEffect that resolves device model).</action>
  <verify>Manual: change model in selector, observe iframe re-renders with new key count within 1s.</verify>
  <done>Device model swap propagates.</done>
</task>

<task id="03.7">
  <file>packages/cli/emulator/src/__tests__/bridge-logs-page.test.tsx + side-panel.test.tsx</file>
  <action>vitest + @testing-library/react. Bridge-logs test: populate 5 messages (mixed sent/received, mixed types), apply each filter, verify only matching remain. Side-panel test: render SidePanel, click each NavLink, verify active class applied.</action>
  <verify>rtk vitest run — both pass.</verify>
  <done>Tests green.</done>
</task>

<task id="03.8">
  <file>packages/cli/frontend/src/App.tsx</file>
  <action>Add `window.addEventListener('message', ...)` handler for `{type: 'device-model-changed', device}` — update `__SIRENO_DEVICE_MODEL__` and trigger a re-render of the resolved device model in `App.tsx`. Existing resolveDeviceModel reads from window once at component mount; refactor to read on each render OR subscribe to a custom event.</action>
  <verify>Manual: same as 03.6 (device model change re-renders).</verify>
  <done>Frontend reacts to postMessage device model change.</done>
</task>

</tasks>
