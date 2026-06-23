import { useState } from "react";

export interface ButtonFrameProps {
  label: string;
  buttonType: string;
  onPress?: () => void;
  onDoublePress?: () => void;
  onHold?: () => void;
  onNavigate?: () => void;
}

export const ButtonFrame = ({
  label,
  buttonType,
  onPress,
  onDoublePress,
  onHold,
  onNavigate,
}: ButtonFrameProps) => {
  const [pressed, setPressed] = useState(false);

  const trigger = (which: "tap" | "dbl-tap" | "hold") => {
    if (which === "tap") onPress?.();
    if (which === "dbl-tap") onDoublePress?.();
    if (which === "hold") onHold?.();
    if (which === "tap" && onNavigate) onNavigate();
  };

  return (
    <button
      type="button"
      data-button-type={buttonType}
      data-pressed={pressed}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => trigger("tap")}
      onDoubleClick={() => trigger("dbl-tap")}
      onContextMenu={(e) => {
        e.preventDefault();
        trigger("hold");
      }}
      className="aspect-square rounded-lg bg-neutral-900 ring-1 ring-neutral-800 hover:ring-neutral-600 focus-visible:ring-2 focus-visible:ring-blue-500 transition flex items-center justify-center text-center text-sm p-2 select-none"
    >
      <span className="text-neutral-300">{label}</span>
    </button>
  );
};
