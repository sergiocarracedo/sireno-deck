import type { ActiveAppSnapshot } from "@/system/provider";

const escapeRegex = (raw: string): string => raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasGlobMeta = (pattern: string): boolean => /[*?\\|]/.test(pattern);

const globToRegex = (pattern: string): RegExp => {
  let source = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === "*") source += ".*";
    else if (c === "?") source += ".";
    else if (c === "\\" && i + 1 < pattern.length) {
      source += escapeRegex(pattern[i + 1] ?? "");
      i += 1;
    } else {
      source += escapeRegex(c ?? "");
    }
  }
  return new RegExp(`^(?:${source})$`, "i");
};

const compileOne = (raw: string): RegExp => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return /^.*/i;
  if (trimmed.includes("|")) {
    const branches = trimmed.split("|").map((s) => {
      const t = s.trim();
      if (t.length === 0) return ".*";
      if (!hasGlobMeta(t)) return escapeRegex(t);
      return globToRegex(t).source;
    });
    return new RegExp(`^(?:${branches.join("|")})$`, "i");
  }
  if (!hasGlobMeta(trimmed)) {
    return new RegExp(escapeRegex(trimmed), "i");
  }
  return globToRegex(trimmed);
};

export const matchesPattern = (name: string, pattern: string): boolean => {
  if (name.length === 0) return false;
  return compileOne(pattern).test(name);
};

export const compileDeckMatcher = (patterns: ReadonlyArray<string>): ((snapshot: ActiveAppSnapshot) => boolean) => {
  if (patterns.length === 0) return () => false;
  const compiled = patterns.map(compileOne);
  return (snapshot: ActiveAppSnapshot): boolean => {
    const candidates: string[] = [];
    if (snapshot.name.length > 0) candidates.push(snapshot.name);
    if (snapshot.windowTitle !== null && snapshot.windowTitle.length > 0) {
      candidates.push(snapshot.windowTitle);
    }
    for (const re of compiled) {
      for (const c of candidates) {
        if (re.test(c)) return true;
      }
    }
    return false;
  };
};
