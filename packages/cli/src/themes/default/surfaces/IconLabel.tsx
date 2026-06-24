import { Icon } from "../components/Icon.tsx";
import { Label } from "../components/Label.tsx";

export interface IconLabelProps {
  icon: string;
  label: string;
  iconSize?: "sm" | "md" | "lg";
}

export const IconLabel = ({ icon, label, iconSize = "md" }: IconLabelProps) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2">
    <Icon ref={icon} size={iconSize} />
    <Label>{label}</Label>
  </div>
);

export const IconLabelDefaultExport = IconLabel;
