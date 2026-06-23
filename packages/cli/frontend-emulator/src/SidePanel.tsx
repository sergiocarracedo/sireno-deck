import type { ReactElement } from "react";

import { DEVICE_MODELS, type DeviceModelSpec } from "@sireno-deck-2/cli";

export interface SidePanelProps {
  readonly wsUrl: string;
  readonly deviceModel: DeviceModelSpec;
  readonly onDeviceModelChange: (next: DeviceModelSpec) => void;
  readonly activeDeckId: string;
  readonly onSelectDeck: (id: string) => void;
}

const MOCK_DECKS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "main", name: "Main" },
  { id: "media", name: "Media" },
  { id: "settings", name: "Settings" },
];

export const SidePanel = ({
  wsUrl,
  deviceModel,
  onDeviceModelChange,
  activeDeckId,
  onSelectDeck,
}: SidePanelProps): ReactElement => {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Connection
        </h2>
        <p className="mt-2 font-mono text-xs text-neutral-300" data-testid="ws-url">
          {wsUrl}
        </p>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Device model
        </h2>
        <select
          className="mt-2 w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm"
          value={deviceModel.id}
          onChange={(e) => {
            const next = DEVICE_MODELS.find((m) => m.id === e.target.value);
            if (next !== undefined) onDeviceModelChange(next);
          }}
          data-testid="device-model-select"
        >
          {DEVICE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.keyCount} keys)
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">Decks</h2>
        <ul className="mt-2 flex flex-col gap-1" data-testid="deck-list">
          {MOCK_DECKS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelectDeck(d.id)}
                className={`w-full rounded px-2 py-1 text-left transition ${
                  d.id === activeDeckId
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
                data-active={d.id === activeDeckId}
              >
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Action log
        </h2>
        <ul
          className="mt-2 flex flex-col gap-1 font-mono text-xs text-neutral-300"
          data-testid="action-log"
        >
          <li className="opacity-60">[shell] awaiting WS handshake…</li>
        </ul>
      </section>
    </div>
  );
};
