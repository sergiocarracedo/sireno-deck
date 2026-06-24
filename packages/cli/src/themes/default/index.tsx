import { ButtonFrame } from "./ButtonFrame.tsx";
import { Icon } from "./components/Icon.tsx";
import { Label } from "./components/Label.tsx";
import { Text } from "./components/Text.tsx";
import { TapIndicator } from "./components/TapIndicator.tsx";
import { Chip } from "./components/Chip.tsx";
import { IconLabel } from "./surfaces/IconLabel.tsx";
import { Bars } from "./surfaces/Bars.tsx";
import { LabelValueList } from "./surfaces/LabelValueList.tsx";
import { SplitAction } from "./surfaces/SplitAction.tsx";

export const manifest = {
  name: "default",
  kind: "theme" as const,
  apiVersion: 3,
} as const;

export { ButtonFrame } from "./ButtonFrame.tsx";
export { Icon } from "./components/Icon.tsx";
export { Label } from "./components/Label.tsx";
export { Text } from "./components/Text.tsx";
export { TapIndicator } from "./components/TapIndicator.tsx";
export { Chip } from "./components/Chip.tsx";
export { IconLabel } from "./surfaces/IconLabel.tsx";
export { Bars } from "./surfaces/Bars.tsx";
export { LabelValueList } from "./surfaces/LabelValueList.tsx";
export { SplitAction } from "./surfaces/SplitAction.tsx";

export const components = { Icon, Label, Text, TapIndicator, Chip } as const;
export const surfaces = { IconLabel, Bars, LabelValueList, SplitAction } as const;
export const primitives = { ButtonFrame } as const;

const Theme = {
  manifest,
  ButtonFrame,
  components,
  surfaces,
  primitives,
};

export default Theme;
