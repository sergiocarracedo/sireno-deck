import type { AddonFrontendButton } from "@/addon/api";

const EmojiButtonFrontend: AddonFrontendButton = ({ config }) => {
  const emoji = (config as { emoji?: string }).emoji ?? "❓";
  return (
    <span className="flex h-full w-full items-center justify-center text-3xl leading-none">
      {emoji}
    </span>
  );
};

export default EmojiButtonFrontend;
