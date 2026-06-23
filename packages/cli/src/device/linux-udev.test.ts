import { describe, expect, it } from "vitest";

import { UDEV_RULES, UdevPermissionError, formatInstallInstructions, installUdevRules } from "./linux-udev.ts";

describe("linux-udev", () => {
  it("UDEV_RULES contains the expected Elgato vendor id 0fd9", () => {
    expect(UDEV_RULES).toContain('idVendor}=="0fd9"');
    expect(UDEV_RULES).toMatch(/SUBSYSTEM=="usb"/);
    expect(UDEV_RULES).toContain('TAG+="uaccess"');
  });

  it("formatInstallInstructions mentions the udev rules path", () => {
    const text = formatInstallInstructions();
    expect(text).toContain("/etc/udev/rules.d/70-sireno-deck.rules");
    expect(text).toContain("udevadm");
  });

  it("installUdevRules throws UdevPermissionError", async () => {
    await expect(installUdevRules()).rejects.toBeInstanceOf(UdevPermissionError);
  });
});
