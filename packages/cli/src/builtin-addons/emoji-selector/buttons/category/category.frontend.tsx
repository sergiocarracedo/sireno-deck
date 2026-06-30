import type { AddonFrontendButton } from "@/addon/api";
export const CategoryButtonFrontend: AddonFrontendButton = ({ config }) => {
  const iconRef = (config as { icon?: string }).icon ?? "🙂";
  const labelRef = (config as { label?: string }).label ?? "Category";
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <span className="text-3xl leading-none">{iconRef}</span>
      <span className="text-xs uppercase tracking-wider text-muted">{labelRef}</span>
    </span>
  );
};
