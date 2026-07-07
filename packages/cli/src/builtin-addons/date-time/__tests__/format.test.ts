/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import { formatDigitalDateTimeLabel } from "../shared/format";

describe("formatDigitalDateTimeLabel", () => {
  const fixed = new Date("2026-06-24T14:35:07.123Z");

  it("expands common tokens", () => {
    const out = formatDigitalDateTimeLabel("YYYY-MM-DD HH:mm:ss", fixed);
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("preserves <markup> tags literally", () => {
    const out = formatDigitalDateTimeLabel("HH<blink>:</blink>mm", fixed);
    expect(out).toContain("<blink>:</blink>");
  });

  it("escapes malformed tags", () => {
    const out = formatDigitalDateTimeLabel("HH<unclosed", fixed);
    expect(out).not.toContain("<unclosed");
  });

  it("defaults format renders date + time", () => {
    const out = formatDigitalDateTimeLabel("DD/MM/YYYY HH:mm:ss", fixed);
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });
});