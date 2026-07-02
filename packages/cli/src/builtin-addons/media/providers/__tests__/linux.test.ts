import { describe, expect, it, vi } from "vitest";

import type { ProviderExecutor } from "../types";
import { createLinuxProvider } from "../linux";

const execResult = (
  stdout: string,
  exitCode = 0,
): { exitCode: number; stdout: string; stderr: string } => ({
  exitCode,
  stdout,
  stderr: "",
});

const makeExecutor = (
  responses: ReadonlyMap<string, string>,
): ProviderExecutor => ({
  run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
    // Match by subcommand so the --format template in `metadata` doesn't
    // break the lookup.
    const sub = args[0] ?? "";
    const stdout = responses.get(sub) ?? "";
    return execResult(stdout);
  }),
});

describe("createLinuxProvider", () => {
  it("maps Playing/Paused/Stopped to play/pause/stop", async () => {
    const executor = makeExecutor(
      new Map([
        ["metadata", "Song\tArtist\tAlbum\t0"],
        ["volume", "0.5"],
        ["position", "0"],
        ["status", "Playing"],
        ["mute", "false"],
      ]),
    );
    const provider = createLinuxProvider({ executor });
    const status = await provider.getStatus();
    expect(status.playStatus).toBe("play");

    const executor2 = makeExecutor(
      new Map([
        ["metadata", "Song\tArtist\tAlbum\t0"],
        ["volume", "0.5"],
        ["position", "0"],
        ["status", "Paused"],
        ["mute", "false"],
      ]),
    );
    expect((await createLinuxProvider({ executor: executor2 }).getStatus()).playStatus).toBe("pause");

    const executor3 = makeExecutor(
      new Map([
        ["metadata", "Song\tArtist\tAlbum\t0"],
        ["volume", "0.5"],
        ["position", "0"],
        ["status", "Stopped"],
        ["mute", "false"],
      ]),
    );
    expect((await createLinuxProvider({ executor: executor3 }).getStatus()).playStatus).toBe("stop");
  });

  it("returns 'unavailable' for unknown status strings", async () => {
    const executor = makeExecutor(
      new Map([
        ["metadata", "Song\tArtist\tAlbum\t0"],
        ["volume", "0.5"],
        ["position", "0"],
        ["status", "WeirdStatus"],
        ["mute", "false"],
      ]),
    );
    const provider = createLinuxProvider({ executor });
    expect((await provider.getStatus()).playStatus).toBe("unavailable");
  });

  it("reads currentTime in seconds (NOT microseconds) from playerctl position", async () => {
    const executor = makeExecutor(
      new Map([
        ["metadata", "Song\tArtist\tAlbum\t240000000"],
        ["volume", "0.5"],
        ["position", "83"],
        ["status", "Playing"],
        ["mute", "false"],
      ]),
    );
    const provider = createLinuxProvider({ executor });
    const status = await provider.getStatus();
    // Bug regression: previously currentTime was rounded from
    // parseFloat("83") / 1_000_000 = ~0. The fix reads position as seconds.
    expect(status.currentTime).toBe(83);
    // And totalTime (from mpris:length in MICROSECONDS) is still divided.
    expect(status.totalTime).toBe(240);
  });

  it("returns zero currentTime when playerctl position fails", async () => {
    const executor: ProviderExecutor = {
      run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
        if (cmd === "playerctl" && args[0] === "position") {
          return execResult("", 1);
        }
        if (cmd === "playerctl" && args[0] === "metadata") {
          return execResult("Song\tArtist\tAlbum\t0");
        }
        if (cmd === "playerctl" && args[0] === "volume") {
          return execResult("0.5");
        }
        if (cmd === "playerctl" && args[0] === "status") {
          return execResult("Playing");
        }
        if (cmd === "playerctl" && args[0] === "mute") {
          return execResult("false");
        }
        return execResult("", 1);
      }),
    };
    const provider = createLinuxProvider({ executor });
    const status = await provider.getStatus();
    expect(status.currentTime).toBe(0);
  });
});