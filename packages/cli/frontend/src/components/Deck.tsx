import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  BUTTON_SIZE_PX,
  DEVICE_MODELS,
  gridForKeyCount,
  type DeviceModelSpec,
} from "@/device/models";

import { addonRegistry } from "virtual:sireno/addons/registry";

import { ButtonFrame, Icon, useAddonChannel, type AddonGestureEvent } from "@sireno-deck/cli";
import { ErrorBoundary } from "./ErrorBoundary";

const BUTTON_SIZE = BUTTON_SIZE_PX;
const BUTTON_GAP_PX = 8;
const DECK_PADDING_PX = 16;

const isCompact = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("compact");

export interface DeckButton {
  id: string;
  type: string;
  label?: string;
  position?: number;
  config?: Record<string, unknown>;
  addonName?: string;
  frontendEntry?: string;
}

export interface Deck {
  id: string;
  name: string;
  buttons: DeckButton[];
}

export interface ButtonGestureState {
  pressed: boolean;
  isTapping: boolean;
  isHolding: boolean;
  holdProgress: number;
}

export type ButtonGestureMap = Readonly<Record<string, ButtonGestureState | undefined>>;

export interface DeckProps {
  readonly deck: Deck;
  readonly gestures?: ButtonGestureMap;
  readonly onAction?: (buttonId: string, gesture: 'tap' | 'dbl-tap' | 'hold') => void;
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

const resolvePosition = (button: DeckButton, fallback: number): number => {
  if (typeof button.position === "number" && Number.isFinite(button.position) && button.position >= 0) {
    return button.position;
  }
  const parsed = Number.parseInt(button.id, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

interface AddonRegistryEntry {
  readonly addonName: string;
  readonly Component: React.ComponentType<{
    readonly config: unknown;
    readonly state: unknown;
    readonly buttonType?: string;
    readonly buttonId?: string;
    readonly gesture?: AddonGestureEvent | null;
    readonly onAction?: (action: string) => void;
  }>;
}

const EMPTY_GESTURE: ButtonGestureState = {
  pressed: false,
  isTapping: false,
  isHolding: false,
  holdProgress: 0,
};

const FallbackLabel = ({ text }: { text: string }): ReactNode => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
    <Icon name="alert-circle" size={20} tone="danger" />
    <span className="truncate font-mono text-[10px] uppercase opacity-70">{text}</span>
  </div>
);

interface ButtonSurfaceProps {
  readonly button: DeckButton;
}

/**
 * Per-button addon surface. Subscribes to the per-button gesture channel and
 * clears the value after handing it off so unrelated re-renders do not re-fire
 * the addon's `useEffect([gesture])`.
 */
const ButtonSurface = ({ button }: ButtonSurfaceProps) => {
  const registryEntry = addonRegistry[button.type];
  const [gesture, setGesture] = useState<AddonGestureEvent | null>(null);
  const channel = `runtime:gesture:${button.id}`;
  const { data } = useAddonChannel<AddonGestureEvent>(channel);

  useEffect(() => {
    if (data !== undefined) setGesture(data);
  }, [data]);

  useEffect(() => {
    if (gesture !== null) {
      // Defer the clear past the current commit so addons see the non-null
      // value once via `useEffect([gesture])` before it flips back to null.
      const handle = setTimeout(() => setGesture(null), 0);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [gesture]);

  if (registryEntry === undefined) return null;
  const Component = registryEntry.Component;
  return (
    <Component
      config={button.config ?? {}}
      state={null}
      buttonType={button.type}
      buttonId={button.id}
      gesture={gesture}
    />
  );
};

export const Deck = ({ deck, gestures, onAction, children }: DeckProps) => {
  const model = resolveDeviceModel();
  const { columns, rows } = gridForKeyCount(model.keyCount);
  const gap = isCompact ? 0 : BUTTON_GAP_PX;
  const pad = isCompact ? 0 : DECK_PADDING_PX;
  const width = columns * BUTTON_SIZE + (columns - 1) * gap + pad * 2;
  const height = rows * BUTTON_SIZE + (rows - 1) * gap + pad * 2;
  return (
    <div
      className={`grid rounded-xl bg-neutral-950 ${isCompact ? "p-0" : "p-4"}`}
      style={
        {
          gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${BUTTON_SIZE}px)`,
          gap: `${gap}px`,
          width,
          height,
        } as CSSProperties
      }
      data-deck-id={deck.id}
      data-columns={columns}
      data-rows={rows}
    >
      {deck.buttons.map((button, idx) => {
        const position = resolvePosition(button, idx);
        const col = (position % columns) + 1;
        const row = Math.floor(position / columns) + 1;
        const gesture = gestures?.[button.id] ?? EMPTY_GESTURE;
        const fallbackText = button.label ?? button.type;
        return (
          <div
            key={button.id}
            style={{ gridColumn: col, gridRow: row, width: BUTTON_SIZE, height: BUTTON_SIZE }}
            data-button-type={button.type}
            className="cursor-pointer"
            onClick={() => onAction?.(button.id, 'tap')}
          >
            <ButtonFrame
              pressed={gesture.pressed}
              isTapping={gesture.isTapping}
              isHolding={gesture.isHolding}
              holdProgress={gesture.holdProgress}
              buttonType={button.type}
            >
              <ErrorBoundary resetKey={button.id}>
                <ButtonSurface button={button} />
              </ErrorBoundary>
            </ButtonFrame>
          </div>
        );
      })}
      {children}
    </div>
  );
};
