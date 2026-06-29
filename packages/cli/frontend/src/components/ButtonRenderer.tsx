import type { ComponentType } from "react";

import { ButtonFrame } from "./ButtonFrame";

export type GestureHandler = () => void;

export interface ButtonRendererProps {
  buttonType: string;
  config: Record<string, unknown>;
  handlers?: {
    tap?: GestureHandler;
    dblTap?: GestureHandler;
    hold?: GestureHandler;
  };
  fallback?: ComponentType<{ config: Record<string, unknown> }>;
}

export const ButtonRenderer = ({
  buttonType,
  config,
  handlers,
  fallback: Fallback,
}: ButtonRendererProps) => {
  if (Fallback !== undefined) {
    return <Fallback config={config} />;
  }
  const label = typeof config["label"] === "string" ? (config["label"] as string) : buttonType;
  return (
    <ButtonFrame
      label={label}
      buttonType={buttonType}
      onPress={handlers?.tap}
      onDoublePress={handlers?.dblTap}
      onHold={handlers?.hold}
    />
  );
};
