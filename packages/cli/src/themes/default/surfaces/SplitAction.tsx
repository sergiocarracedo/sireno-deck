import type { ReactNode } from "react";

export interface SplitActionSide {
  content: ReactNode;
}

export interface SplitActionProps {
  left: SplitActionSide;
  right: SplitActionSide;
}

export const SplitAction = ({ left, right }: SplitActionProps) => (
  <div className="grid h-full w-full grid-cols-2">
    <div className="flex h-full w-full items-center justify-center p-2">{left.content}</div>
    <div className="flex h-full w-full items-center justify-center border-l border-fg/10 p-2">
      {right.content}
    </div>
  </div>
);

export const SplitActionDefaultExport = SplitAction;
