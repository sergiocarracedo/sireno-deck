import type { RawConfig } from "./schemas.ts";

export interface BootstrapIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface BootstrapResult {
  issues: BootstrapIssue[];
}

const reportDuplicatePositions = (
  deckId: string,
  deck: RawConfig["decks"][string],
): BootstrapIssue[] => {
  const seen = new Map<number, number>();
  const issues: BootstrapIssue[] = [];
  deck.buttons.forEach((btn, index) => {
    if (typeof btn === "string") return;
    if (btn.position === undefined) return;
    const prev = seen.get(btn.position);
    if (prev !== undefined) {
      issues.push({
        level: "error",
        path: `decks.${deckId}.buttons[${index}]`,
        message: `Duplicate position ${btn.position} (also at index ${prev})`,
      });
    } else {
      seen.set(btn.position, index);
    }
  });
  return issues;
};

export const validateBootstrap = (config: RawConfig): BootstrapResult => {
  const issues: BootstrapIssue[] = [];
  if (!("main" in config.decks)) {
    issues.push({
      level: "error",
      path: "decks",
      message: "Missing required `main` deck",
    });
  }
  for (const [id, deck] of Object.entries(config.decks)) {
    issues.push(...reportDuplicatePositions(id, deck));
  }
  return { issues };
};

export const isBootstrapValid = (result: BootstrapResult): boolean =>
  result.issues.every((i) => i.level !== "error");

export const formatBootstrapIssues = (issues: BootstrapIssue[]): string =>
  issues
    .map((issue) => {
      const tag = issue.level === "error" ? "error" : "warning";
      return `[${tag}] ${issue.path}: ${issue.message}`;
    })
    .join("\n");
