import { ButtonFrame } from "./ButtonFrame.tsx";
import { Text, Icon, Label, Chip, TapIndicator } from "@/ui/index.ts";
import { Bars as Barss, IconLabelSurface as IconLabels, LabelValueList as LabelValueLists, SplitActionSurface as SplitActions } from "@/ui/index.ts";

export const manifest = {
  name: "default",
  kind: "theme" as const,
  apiVersion: 3,
} as const;

export { ButtonFrame } from "./ButtonFrame.tsx";
export { Text, Icon, Label, Chip, TapIndicator } from "@/ui/index.ts";
export { Bars as Barss, IconLabelSurface as IconLabels, LabelValueList as LabelValueLists, SplitActionSurface as SplitActions } from "@/ui/index.ts";

export const components = { Icon, Label, Text, TapIndicator, Chip } as const;
export const surfaces = { Bars: Barss, IconLabel: IconLabels, LabelValueList: LabelValueLists, SplitAction: SplitActions } as const;
export const primitives = { ButtonFrame } as const;

export const ui = {} as const;

const Theme = {
  manifest,
  ButtonFrame,
  components,
  surfaces,
  primitives,
  ui,
};

export default Theme;
