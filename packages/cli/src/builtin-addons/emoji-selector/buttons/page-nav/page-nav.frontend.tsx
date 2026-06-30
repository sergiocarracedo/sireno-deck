import type { AddonFrontendButton } from "@/addon/api";
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
