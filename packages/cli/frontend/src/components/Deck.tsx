import type { ReactNode } from "react";
import { ButtonFrame } from "./ButtonFrame.tsx";

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
  deck: Deck;
  onNavigate?: (deckId: string) => void;
  onAction?: (buttonId: string, gesture: "tap" | "dbl-tap" | "hold") => void;
  children?: ReactNode;
}

export const Deck = ({ deck, onNavigate, onAction, children }: DeckProps) => {
  return (
    <div
      className="grid gap-2 p-4"
      style={{ gridTemplateColumns: "repeat(5, 72px)", gridTemplateRows: "repeat(3, 72px)" }}
      data-deck-id={deck.id}
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
