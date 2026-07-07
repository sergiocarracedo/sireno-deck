import { describe, expect, it } from "vitest";

import { emulatorServerEntryExists, parseReadyLine } from "../emulator-server";

describe("emulatorServerEntryExists", () => {
  it("returns false when package.json is missing", () => {
    expect(emulatorServerEntryExists("/nonexistent/path")).toBe(false);
  });
});

describe("parseReadyLine", () => {
  it("parses 'READY 54321' as port 54321", () => {
    expect(parseReadyLine("READY 54321")).toBe(54321);
  });

  it("parses 'READY <port>\\n' trimming whitespace", () => {
    expect(parseReadyLine("READY 54321\n")).toBe(54321);
    expect(parseReadyLine("READY 54321   ")).toBe(54321);
  });

  it("returns null for non-READY lines", () => {
    expect(parseReadyLine("VITE v6 ready")).toBeNull();
    expect(parseReadyLine("")).toBeNull();
  });

  it("returns null for unparseable port", () => {
    expect(parseReadyLine("READY abc")).toBeNull();
    expect(parseReadyLine("READY")).toBeNull();
  });
});
