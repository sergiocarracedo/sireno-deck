import type { ReactElement, ReactNode } from "react";
import { TapIndicator } from "../components/TapIndicator";

export interface SplitActionProps {
  primary: ReactElement;
  secondary?: ReactElement;
}

export const SplitAction = ({ primary, secondary }: SplitActionProps): ReactElement => {
  if (!secondary) {
    return <div className="contents">{primary}</div>;
  }

  return (
    <div className="relative size-full flex flex-col">
      <hr className="absolute w-10 border-none h-px top-1/2 left-1/2 bg-accent -ml-5 -rotate-45" />
      <div className="absolute -top-1 right-1 z-10">
        <TapIndicator type="tap" size="xs" />
      </div>
      <div className="flex-1 overflow-hidden flex items-start justify-center absolute top-0 left-0">
        <div
          className="scale-[0.65] origin-top"
          style={{ width: "100%", height: "100%" }}
        >
          {primary}
        </div>
      </div>

      <div className="absolute -bottom-1 left-1 z-10">
        <TapIndicator type="dbltap" size="xs" />
      </div>
      <div className="flex-1 overflow-hidden flex items-end justify-center absolute bottom-0 right-0">
        <div
          className="scale-[0.65] origin-bottom"
          style={{ width: "100%", height: "100%" }}
        >
          {secondary}
        </div>
      </div>
    </div>
  );
};

export const SplitActionDefaultExport = SplitAction;
