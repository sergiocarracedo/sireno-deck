import { useState } from "react";

import { DEVICE_MODELS, type DeviceModelSpec } from "@sireno-deck-2/cli";

import { DeckFrame } from "./DeckFrame.tsx";
import { SidePanel } from "./SidePanel.tsx";

export interface ShellProps {
  readonly wsUrl: string;
  readonly initialDeviceModel: string;
}

export const Shell = ({ wsUrl, initialDeviceModel }: ShellProps): React.ReactElement => {
  const initialSpec: DeviceModelSpec =
    DEVICE_MODELS.find((m) => m.id === initialDeviceModel) ?? DEVICE_MODELS[0]!;

  const [activeDeckId, setActiveDeckId] = useState<string>("main");
  const [deviceModel, setDeviceModel] = useState<DeviceModelSpec>(initialSpec);

  return (
    <div
      data-testid="emulator-shell"
      className="grid h-full grid-cols-[280px_1fr] bg-neutral-950 text-neutral-100"
    >
      <aside className="border-r border-neutral-800 bg-neutral-900/60 p-4 overflow-y-auto">
        <SidePanel
          wsUrl={wsUrl}
          deviceModel={deviceModel}
          onDeviceModelChange={setDeviceModel}
          activeDeckId={activeDeckId}
          onSelectDeck={setActiveDeckId}
        />
      </aside>
      <main className="flex items-center justify-center bg-neutral-950 p-8">
        <DeckFrame deviceModel={deviceModel} activeDeckId={activeDeckId} />
      </main>
    </div>
  );
};
