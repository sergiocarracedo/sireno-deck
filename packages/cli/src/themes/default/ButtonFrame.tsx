import type { ReactNode } from "react";

export interface ButtonFrameProps {
  pressed: boolean;
  isTapping: boolean;
  isHolding: boolean;
  holdProgress: number;
  buttonType: string;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export const ButtonFrame = ({ children }: ButtonFrameProps) => (
  <div
    className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-bg p-1 border-2 border-solid border-frame"
    data-sireno-button-frame="true"
  >
    {children}
  </div>
);

export const ButtonFrameDefaultExport = ButtonFrame;
