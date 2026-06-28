import type { ReactNode } from "react";

import { Text } from "./Text.tsx";

export interface LabelProps {
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
  truncate?: boolean;
}

export const Label = ({ children, className, uppercase = true }: LabelProps) => (
  <span data-sireno-ui-label="true">
    <Text
      className={[
        uppercase ? "uppercase" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      fit="ellipsis"
      size="md"
      tone="primary"
      typography="main"
    >
      {children}
    </Text>
  </span>
);

export const LabelDefaultExport = Label;
