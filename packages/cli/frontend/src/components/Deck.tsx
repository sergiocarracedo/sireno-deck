import type { ReactNode } from "react";
import {
  BUTTON_SIZE_PX,
  DEVICE_MODELS,
  gridForKeyCount,
  type DeviceModelSpec,
} from "@/device/models.ts";

import { ButtonFrame } from "./ButtonFrame.tsx";

const BUTTON_SIZE = BUTTON_SIZE_PX;

export interface DeckButton {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, unknown>;
}

export interface Deck {
  id: string;
  name: string;
  buttons: DeckButton[];
}

export interface DeckProps {
  readonly deck: Deck;
  readonly onNavigate?: (deckId: string) => void;
  readonly onAction?: (buttonId: string, gesture: "tap" | "dbl-tap" | "hold") => void;
  readonly children?: ReactNode;
}

const resolveDeviceModel = (): DeviceModelSpec => {
  if (typeof window !== "undefined") {
    const id =
      (window as unknown as { __SIRENO_DEVICE_MODEL__?: string }).__SIRENO_DEVICE_MODEL__ ??
      new URLSearchParams(window.location.search).get("device");
    if (id !== undefined && id !== null) {
      const found = DEVICE_MODELS.find((m) => m.id === id);
      if (found !== undefined) return found;
    }
  }
  return DEVICE_MODELS[0]!;
};

export const Deck = ({ deck, onNavigate, onAction, children }: DeckProps) => {
  const model = resolveDeviceModel();
  const { columns, rows } = gridForKeyCount(model.keyCount);
  return (
    <div
      className="grid p-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE}px)`,
        gridTemplateRows: `repeat(${rows}, ${BUTTON_SIZE}px)`,
        width: columns * BUTTON_SIZE + 32,
        height: rows * BUTTON_SIZE + 32,
      }}
      data-deck-id={deck.id}
      data-columns={columns}
      data-rows={rows}
    >
      {deck.buttons.map((button) => (
        <ButtonFrame
          key={button.id}
          label={button.label ?? button.id}
          buttonType={button.type}
          onPress={() => onAction?.(button.id, "tap")}
          onDoublePress={() => onAction?.(button.id, "dbl-tap")}
          onHold={() => onAction?.(button.id, "hold")}
          onNavigate={
            button.type === "core:change-deck" && typeof button.config?.["deck"] === "string"
              ? () => onNavigate?.(button.config!.deck as string)
              : undefined
          }
        />
      ))}
      {children}
    </div>
  );
};
