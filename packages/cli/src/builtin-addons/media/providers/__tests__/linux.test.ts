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

const makeExecutor = (responses: ReadonlyMap<string, string>): ProviderExecutor => ({
  run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
    const key = `${cmd} ${args.join(" ")}`;
    const stdout = responses.get(key) ?? "";
    return execResult(stdout);
  }),
});

const WPCTL_STATUS_UNMUTED = [
  "PipeWire 'pipewire-0' [0.3.85, user@host]",
  "Audio",
  " ├─ Sinks:",
  " │    *   46. HyperX 7.1 Audio Analog Stereo      [vol: 0.50]",
  " │        44. HyperX 7.1 Audio Analog Stereo      [vol: 0.50]",
].join("\n");

const WPCTL_STATUS_MUTED = [
  "PipeWire 'pipewire-0' [0.3.85, user@host]",
  "Audio",
  " ├─ Sinks:",
  " │    *   46. HyperX 7.1 Audio Analog Stereo      [vol: 0.50 MUTED]",
].join("\n");

const WPCTL_GET_VOLUME_HALF = "Volume: 0.50";

const baseResponses = (status: string) =>
  new Map<string, string>([
    [
      "playerctl metadata --format {{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}",
      "Song\tArtist\tAlbum\t0",
    ],
    ["playerctl position", "0"],
    ["playerctl status", status],
    ["wpctl get-volume @DEFAULT_AUDIO_SINK@", WPCTL_GET_VOLUME_HALF],
    ["wpctl status", WPCTL_STATUS_UNMUTED],
  ]);

describe("createLinuxProvider", () => {
  it("maps Playing/Paused/Stopped to play/pause/stop", async () => {
    const provider1 = createLinuxProvider({ executor: makeExecutor(baseResponses("Playing")) });
    expect((await provider1.getStatus()).playStatus).toBe("play");

    const provider2 = createLinuxProvider({ executor: makeExecutor(baseResponses("Paused")) });
    expect((await provider2.getStatus()).playStatus).toBe("pause");

    const provider3 = createLinuxProvider({ executor: makeExecutor(baseResponses("Stopped")) });
    expect((await provider3.getStatus()).playStatus).toBe("stop");
  });

  it("returns 'unavailable' for unknown status strings", async () => {
    const provider = createLinuxProvider({ executor: makeExecutor(baseResponses("WeirdStatus")) });
    expect((await provider.getStatus()).playStatus).toBe("unavailable");
  });

  it("reads currentTime in seconds (NOT microseconds) from playerctl position", async () => {
    const responses = baseResponses("Playing");
    responses.set(
      "playerctl metadata --format {{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}",
      "Song\tArtist\tAlbum\t240000000",
    );
    responses.set("playerctl position", "83");
    const provider = createLinuxProvider({ executor: makeExecutor(responses) });
    const status = await provider.getStatus();
    expect(status.currentTime).toBe(83);
    expect(status.totalTime).toBe(240);
  });

  it("returns zero currentTime when playerctl position fails", async () => {
    const responses = baseResponses("Playing");
    responses.set("playerctl position", "");
    const executor: ProviderExecutor = {
      run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
        const key = `${cmd} ${args.join(" ")}`;
        if (key === "playerctl position") return execResult("", 1);
        return execResult(responses.get(key) ?? "");
      }),
    };
    const provider = createLinuxProvider({ executor });
    expect((await provider.getStatus()).currentTime).toBe(0);
  });

  it("reads volume from wpctl get-volume @DEFAULT_AUDIO_SINK@", async () => {
    const responses = baseResponses("Playing");
    responses.set("wpctl get-volume @DEFAULT_AUDIO_SINK@", "Volume: 0.75");
    const provider = createLinuxProvider({ executor: makeExecutor(responses) });
    const status = await provider.getStatus();
    expect(status.volume).toBe(0.75);
  });

  it("falls back to volume=1 when wpctl get-volume fails", async () => {
    const responses = baseResponses("Playing");
    responses.delete("wpctl get-volume @DEFAULT_AUDIO_SINK@");
    const executor: ProviderExecutor = {
      run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
        const key = `${cmd} ${args.join(" ")}`;
        if (key === "wpctl get-volume @DEFAULT_AUDIO_SINK@") return execResult("", 1);
        return execResult(responses.get(key) ?? "");
      }),
    };
    const provider = createLinuxProvider({ executor });
    expect((await provider.getStatus()).volume).toBe(1);
  });

  it("detects muted from wpctl status tree (with the │ U+2502 character)", async () => {
    const responses = baseResponses("Playing");
    responses.set("wpctl status", WPCTL_STATUS_MUTED);
    const provider = createLinuxProvider({ executor: makeExecutor(responses) });
    expect((await provider.getStatus()).muted).toBe(true);
  });

  it("detects unmuted from wpctl status tree", async () => {
    const provider = createLinuxProvider({ executor: makeExecutor(baseResponses("Playing")) });
    expect((await provider.getStatus()).muted).toBe(false);
  });

  it("returns muted=false when wpctl status fails", async () => {
    const responses = baseResponses("Playing");
    responses.delete("wpctl status");
    const executor: ProviderExecutor = {
      run: vi.fn(async (cmd: string, args: ReadonlyArray<string>) => {
        const key = `${cmd} ${args.join(" ")}`;
        if (key === "wpctl status") return execResult("", 1);
        return execResult(responses.get(key) ?? "");
      }),
    };
    const provider = createLinuxProvider({ executor });
    expect((await provider.getStatus()).muted).toBe(false);
  });

  it("setVolume calls wpctl set-volume with the absolute percentage", async () => {
    const run = vi.fn(async () => execResult("Volume: 0.42"));
    const provider = createLinuxProvider({ executor: { run } });
    await provider.setVolume(0.42);
    expect(run).toHaveBeenCalledWith("wpctl", ["set-volume", "@DEFAULT_AUDIO_SINK@", "42%"], {
      timeoutMs: 5_000,
    });
  });

  it("volumeUp calls wpctl set-volume with relative %+", async () => {
    const run = vi.fn(async () => execResult(""));
    const provider = createLinuxProvider({ executor: { run } });
    await provider.volumeUp(0.05);
    expect(run).toHaveBeenCalledWith("wpctl", ["set-volume", "@DEFAULT_AUDIO_SINK@", "5%+"], {
      timeoutMs: 5_000,
    });
  });

  it("volumeDown calls wpctl set-volume with relative %-", async () => {
    const run = vi.fn(async () => execResult(""));
    const provider = createLinuxProvider({ executor: { run } });
    await provider.volumeDown(0.1);
    expect(run).toHaveBeenCalledWith("wpctl", ["set-volume", "@DEFAULT_AUDIO_SINK@", "10%-"], {
      timeoutMs: 5_000,
    });
  });

  it("toggleMute calls wpctl set-mute toggle", async () => {
    const run = vi.fn(async () => execResult(""));
    const provider = createLinuxProvider({ executor: { run } });
    await provider.toggleMute();
    expect(run).toHaveBeenCalledWith("wpctl", ["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"], {
      timeoutMs: 5_000,
    });
  });

  it("play/pause/toggle/next/previous call playerctl (transport stays per-app)", async () => {
    const run = vi.fn(async () => execResult(""));
    const provider = createLinuxProvider({ executor: { run } });
    await provider.play();
    await provider.pause();
    await provider.toggle();
    await provider.next();
    await provider.previous();
    const calls = run.mock.calls.map(([cmd, args]) => `${cmd} ${args.join(" ")}`);
    expect(calls).toEqual([
      "playerctl play",
      "playerctl pause",
      "playerctl play-pause",
      "playerctl next",
      "playerctl previous",
    ]);
  });
});
