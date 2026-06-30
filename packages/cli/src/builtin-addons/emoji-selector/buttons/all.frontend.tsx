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

export const EmojiButtonFrontend: AddonFrontendButton = ({ config }) => {
  const emoji = (config as { emoji?: string }).emoji ?? "❓";
  return (
    <span className="flex h-full w-full items-center justify-center text-3xl leading-none">
      {emoji}
    </span>
  );
};

export const LauncherButtonFrontend: AddonFrontendButton = () => (
  <span className="flex h-full w-full items-center justify-center gap-1">
    <span className="text-2xl leading-none">🙂</span>
    <span className="font-mono text-xs uppercase tracking-wider text-muted">Emoji</span>
  </span>
);

export const BackButtonFrontend: AddonFrontendButton = () => (
  <span className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-wider text-muted">
    Back
  </span>
);

export const PageNavButtonFrontend: AddonFrontendButton = ({ config }) => {
  const prev = (config as { prev_deck_id?: string }).prev_deck_id;
  const next = (config as { next_deck_id?: string }).next_deck_id;
  const page = (config as { page?: number }).page ?? 1;
  const total = (config as { total_pages?: number }).total_pages ?? 1;
  return (
    <span className="flex h-full w-full items-center justify-between gap-1 px-2 font-mono text-[10px] uppercase tracking-wider text-muted">
      {prev ? (
        <span
          className="cursor-pointer text-fg hover:text-accent"
          onClick={(e) => {
            e.stopPropagation();
            void (window as unknown as { __SIRENO_NAV__?: (id: string) => void }).__SIRENO_NAV__?.(prev);
          }}
        >
          ‹
        </span>
      ) : (
        <span />
      )}
      <span>
        {page}/{total}
      </span>
      {next ? (
        <span
          className="cursor-pointer text-fg hover:text-accent"
          onClick={(e) => {
            e.stopPropagation();
            void (window as unknown as { __SIRENO_NAV__?: (id: string) => void }).__SIRENO_NAV__?.(next);
          }}
        >
          ›
        </span>
      ) : (
        <span />
      )}
    </span>
  );
};
