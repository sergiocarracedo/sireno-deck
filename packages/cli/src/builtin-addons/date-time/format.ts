import type { BuiltinDisplayDateTimeButtonConfig } from "./schemas";

interface FormatSegment {
  kind: "markup" | "token";
  value: string;
}

const escapeLiteral = (value: string): string => `[${value.replaceAll("]", "\\]")}]`;

const TOKEN_MAP: Record<string, (d: Date) => string> = {
  YY: (d) => String(d.getFullYear() % 100).padStart(2, "0"),
  YYYY: (d) => String(d.getFullYear()),
  M: (d) => String(d.getMonth() + 1),
  MM: (d) => String(d.getMonth() + 1).padStart(2, "0"),
  MMM: (d) => d.toLocaleString("en-US", { month: "short" }),
  MMMM: (d) => d.toLocaleString("en-US", { month: "long" }),
  D: (d) => String(d.getDate()),
  DD: (d) => String(d.getDate()).padStart(2, "0"),
  d: (d) => String(d.getDay()),
  ddd: (d) => d.toLocaleString("en-US", { weekday: "short" }),
  dddd: (d) => d.toLocaleString("en-US", { weekday: "long" }),
  H: (d) => String(d.getHours()),
  HH: (d) => String(d.getHours()).padStart(2, "0"),
  h: (d) => String(((d.getHours() + 11) % 12) + 1),
  hh: (d) => String(((d.getHours() + 11) % 12) + 1).padStart(2, "0"),
  m: (d) => String(d.getMinutes()),
  mm: (d) => String(d.getMinutes()).padStart(2, "0"),
  s: (d) => String(d.getSeconds()),
  ss: (d) => String(d.getSeconds()).padStart(2, "0"),
  SSS: (d) => String(d.getMilliseconds()).padStart(3, "0"),
  A: (d) => (d.getHours() < 12 ? "AM" : "PM"),
  a: (d) => (d.getHours() < 12 ? "am" : "pm"),
};

const splitFormat = (pattern: string): FormatSegment[] => {
  const segments: FormatSegment[] = [];
  let cursor = 0;
  while (cursor < pattern.length) {
    const tagStart = pattern.indexOf("<", cursor);
    if (tagStart === -1) {
      if (cursor < pattern.length) {
        segments.push({ kind: "token", value: pattern.slice(cursor) });
      }
      break;
    }
    if (tagStart > cursor) {
      segments.push({ kind: "token", value: pattern.slice(cursor, tagStart) });
    }
    const tagEnd = pattern.indexOf(">", tagStart + 1);
    if (tagEnd === -1) {
      segments.push({ kind: "token", value: escapeLiteral(pattern.slice(tagStart)) });
      break;
    }
    segments.push({ kind: "markup", value: pattern.slice(tagStart, tagEnd + 1) });
    cursor = tagEnd + 1;
  }
  return segments;
};

const expandTokens = (tokenString: string, date: Date): string => {
  let result = "";
  let i = 0;
  while (i < tokenString.length) {
    let matched = false;
    for (const len of [4, 3, 2, 1]) {
      const slice = tokenString.slice(i, i + len);
      const handler = TOKEN_MAP[slice];
      if (handler) {
        result += handler(date);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += tokenString[i];
      i += 1;
    }
  }
  return result;
};

export const formatDigitalDateTimeLabel = (
  format: BuiltinDisplayDateTimeButtonConfig["format"],
  date = new Date(),
): string =>
  splitFormat(format)
    .map((segment) => (segment.kind === "markup" ? segment.value : expandTokens(segment.value, date)))
    .join("");