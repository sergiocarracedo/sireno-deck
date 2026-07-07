import type { ValueEntry } from "../schemas";

export interface FormattedValue {
  available: boolean;
  value: string;
  units?: string;
}

const strip = (raw: string): string => raw.replace(/\s+$/, "");

const firstLine = (raw: string): string => {
  const idx = raw.indexOf("\n");
  return idx === -1 ? raw : raw.slice(0, idx);
};

export const formatCommandOutput = (
  raw: string,
  formatter: ValueEntry["formatter"],
  units?: string,
): FormattedValue => {
  let value: string;
  switch (formatter) {
    case "strip":
      value = strip(raw);
      break;
    case "line":
      value = firstLine(raw);
      break;
    case "raw":
    default:
      value = raw.trim();
      break;
  }
  return {
    available: true,
    value,
    ...(units ? { units } : {}),
  };
};