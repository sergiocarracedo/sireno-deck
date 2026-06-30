import { ButtonFrame } from "./ButtonFrame";
import { Text, Icon, Label, Chip, TapIndicator } from "@/ui/index";
import { BarsSurface as Barss, IconLabelSurface as IconLabels, LabelValueListSurface as LabelValueLists, SplitActionSurface as SplitActions } from "@/ui/index";

export const manifest = {
  name: "light",
  kind: "theme" as const,
  apiVersion: 3,
} as const;

export { ButtonFrame } from "./ButtonFrame";
export { Text, Icon, Label, Chip, TapIndicator } from "@/ui/index";
export { BarsSurface as Barss, IconLabelSurface as IconLabels, LabelValueListSurface as LabelValueLists, SplitActionSurface as SplitActions } from "@/ui/index";

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
