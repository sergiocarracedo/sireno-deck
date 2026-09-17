import { describe, expect, it } from "vitest"

import {
  createDarwinProvider,
  parsePlayerStatus,
  parseVolumeSettings,
} from "../darwin"
import type { ProviderExecutor } from "../types"

// ASCII unit separator - cannot occur in track metadata.
const SEP = "\u001f"

interface Call {
  readonly command: string
  readonly script: string
}

/**
 * Routes each osascript invocation by the shape of its script, so a test can
 * declare "these processes are running" and "this is the player's state"
 * without caring about call order.
 */
const makeExecutor = (opts: {
  processes?: ReadonlyArray<string>
  playerStdout?: string
  volume?: { output: number; muted: boolean }
  failPlayer?: boolean
}): { executor: ProviderExecutor; calls: Call[] } => {
  const calls: Call[] = []
  const processes = opts.processes ?? []
  const volume = opts.volume ?? { output: 40, muted: false }
  const executor: ProviderExecutor = {
    async run(command, args) {
      const script = args[1] ?? ""
      calls.push({ command, script })
      // These cases cover the AppleScript fallback, so the system-wide helper
      // is reported as unavailable — `media-control test` exits non-zero.
      if (command === "media-control") {
        return { exitCode: 1, stdout: "", stderr: "not available" }
      }
      if (script.includes("every process whose background only")) {
        return { exitCode: 0, stdout: processes.join(", "), stderr: "" }
      }
      if (script.includes("get volume settings")) {
        return {
          exitCode: 0,
          stdout: `${volume.output}${SEP}${volume.muted}`,
          stderr: "",
        }
      }
      if (script.includes("player state")) {
        if (opts.failPlayer === true) {
          return { exitCode: 1, stdout: "", stderr: "boom" }
        }
        return { exitCode: 0, stdout: opts.playerStdout ?? "", stderr: "" }
      }
      return { exitCode: 0, stdout: "", stderr: "" }
    },
  }
  return { executor, calls }
}

const scripts = (calls: ReadonlyArray<Call>): string =>
  calls.map((c) => c.script).join("\n---\n")

describe("parseVolumeSettings", () => {
  it("maps macOS 0-100 output volume onto the 0-1 interface", () => {
    expect(parseVolumeSettings(`75${SEP}false`)).toEqual({
      volume: 0.75,
      muted: false,
    })
  })

  it("reads the muted flag", () => {
    expect(parseVolumeSettings(`0${SEP}true`)).toEqual({
      volume: 0,
      muted: true,
    })
  })
})

describe("parsePlayerStatus", () => {
  it("converts Spotify's millisecond duration to seconds", () => {
    const out = ["playing", "12.5", "210000", "Track", "Artist", "Album"].join(
      SEP,
    )
    expect(parsePlayerStatus(out, "ms")).toEqual({
      track: { name: "Track", artist: "Artist", album: "Album" },
      totalTime: 210,
      currentTime: 12.5,
      playStatus: "play",
    })
  })

  it("leaves Music's second-based duration alone", () => {
    const out = ["paused", "3", "180", "T", "A", "Al"].join(SEP)
    expect(parsePlayerStatus(out, "s")).toMatchObject({
      totalTime: 180,
      playStatus: "pause",
    })
  })

  it("treats 'missing value' metadata as no track", () => {
    const out = ["stopped", "0", "0", "", "", ""].join(SEP)
    expect(parsePlayerStatus(out, "ms").track).toBeNull()
  })

  it("keeps a comma in the track title intact", () => {
    const out = ["playing", "0", "1000", "Hello, World", "A, B", ""].join(SEP)
    expect(parsePlayerStatus(out, "ms").track).toEqual({
      name: "Hello, World",
      artist: "A, B",
    })
  })
})

describe("createDarwinProvider", () => {
  it("never addresses a player application when none is running", async () => {
    const { executor, calls } = makeExecutor({ processes: ["Finder", "Slack"] })
    const status = await createDarwinProvider({ executor }).getStatus()

    // Regression: `tell application "Spotify"` LAUNCHES Spotify. On a machine
    // where it is installed but closed, the status poller reopened it.
    expect(scripts(calls)).not.toContain('tell application "Spotify"')
    expect(status.playStatus).toBe("unavailable")
    expect(status.track).toBeNull()
  })

  it("still reports real system volume with no player running", async () => {
    const { executor } = makeExecutor({
      processes: ["Finder"],
      volume: { output: 25, muted: true },
    })
    const status = await createDarwinProvider({ executor }).getStatus()
    // Regression: volume/muted used to be hardcoded to 1/false.
    expect(status.volume).toBe(0.25)
    expect(status.muted).toBe(true)
  })

  it("reads track state from the running player", async () => {
    const { executor } = makeExecutor({
      processes: ["Finder", "Spotify"],
      playerStdout: ["playing", "30", "240000", "N", "A", "Al"].join(SEP),
      volume: { output: 50, muted: false },
    })
    const status = await createDarwinProvider({ executor }).getStatus()
    expect(status).toEqual({
      track: { name: "N", artist: "A", album: "Al" },
      totalTime: 240,
      currentTime: 30,
      playStatus: "play",
      volume: 0.5,
      muted: false,
    })
  })

  it("prefers Spotify over Music when both are running", async () => {
    const { executor, calls } = makeExecutor({
      processes: ["Music", "Spotify"],
      playerStdout: ["playing", "0", "0", "", "", ""].join(SEP),
    })
    await createDarwinProvider({ executor }).getStatus()
    expect(scripts(calls)).toContain('tell application "Spotify"')
    expect(scripts(calls)).not.toContain('tell application "Music"')
  })

  it("falls back to unavailable when the player script fails", async () => {
    const { executor } = makeExecutor({
      processes: ["Spotify"],
      failPlayer: true,
      volume: { output: 10, muted: false },
    })
    const status = await createDarwinProvider({ executor }).getStatus()
    expect(status.playStatus).toBe("unavailable")
    expect(status.volume).toBe(0.1)
  })

  it("volumeUp drives system output volume, not the player's", async () => {
    const { executor, calls } = makeExecutor({
      processes: ["Spotify"],
      volume: { output: 40, muted: false },
    })
    await createDarwinProvider({ executor }).volumeUp(0.1)
    expect(scripts(calls)).toContain("set volume output volume 50")
    expect(scripts(calls)).not.toContain("sound volume")
  })

  it("volumeDown clamps at zero", async () => {
    const { executor, calls } = makeExecutor({
      processes: [],
      volume: { output: 5, muted: false },
    })
    await createDarwinProvider({ executor }).volumeDown(0.5)
    expect(scripts(calls)).toContain("set volume output volume 0")
  })

  it("toggleMute unmutes when currently muted", async () => {
    const { executor, calls } = makeExecutor({
      processes: [],
      volume: { output: 0, muted: true },
    })
    await createDarwinProvider({ executor }).toggleMute()
    expect(scripts(calls)).toContain("set volume without output muted")
  })

  it("transport verbs are a no-op when no player is running", async () => {
    const { executor, calls } = makeExecutor({ processes: ["Finder"] })
    await createDarwinProvider({ executor }).toggle()
    expect(scripts(calls)).not.toContain("playpause")
  })

  it("transport verbs address the running player", async () => {
    const { executor, calls } = makeExecutor({ processes: ["Spotify"] })
    await createDarwinProvider({ executor }).next()
    expect(scripts(calls)).toContain('tell application "Spotify" to next track')
  })

  it("volume verbs work with no player running", async () => {
    const { executor } = makeExecutor({ processes: [] })
    await expect(
      createDarwinProvider({ executor }).setVolume(0.3),
    ).resolves.toBeUndefined()
  })
})

describe("provider factory wiring", () => {
  it("is selected for darwin", async () => {
    const { createMediaProvider } = await import("../index")
    const seen: string[] = []
    const run = async (command: string) => {
      seen.push(command)
      return { exitCode: 1, stdout: "", stderr: "" }
    }
    const provider = createMediaProvider("darwin", {
      run,
    } as unknown as ProviderExecutor)
    await provider.getStatus()
    // The darwin provider probes the system-wide helper first; with every
    // command failing it falls back to osascript, so both are attempted.
    expect(seen[0]).toBe("media-control")
    expect(seen).toContain("osascript")
  })
})

// ponytail: media-control (brew install media-control) is the macOS analogue
// of Linux's playerctl — a single system-wide Now Playing surface that sees
// browsers, not just AppleScript-scriptable desktop players. Verbatim payload
// shape from media-control 0.7.7 on macOS 26.
const MEDIA_CONTROL_JSON = JSON.stringify({
  playbackRate: 0,
  album: "HELLO MONSTERS",
  elapsedTimeNow: 107.53,
  elapsedTime: 100.1,
  timestamp: "2026-09-15T08:30:27Z",
  bundleIdentifier: "com.google.Chrome",
  title: "DREAM - Live Version",
  duration: 224.026,
  artist: "BABYMONSTER",
  playing: false,
})

const makeHelperExecutor = (opts: {
  testExit?: number
  getStdout?: string
  getExit?: number
}): { executor: ProviderExecutor; calls: Array<string[]> } => {
  const calls: Array<string[]> = []
  const executor: ProviderExecutor = {
    async run(command, args) {
      calls.push([command, ...args])
      if (command === "media-control" && args[0] === "test") {
        return { exitCode: opts.testExit ?? 0, stdout: "", stderr: "" }
      }
      if (command === "media-control" && args[0] === "get") {
        return {
          exitCode: opts.getExit ?? 0,
          stdout: opts.getStdout ?? MEDIA_CONTROL_JSON,
          stderr: "",
        }
      }
      if (command === "media-control") {
        return { exitCode: 0, stdout: "", stderr: "" }
      }
      if ((args[1] ?? "").includes("get volume settings")) {
        return { exitCode: 0, stdout: `44${SEP}false`, stderr: "" }
      }
      return { exitCode: 0, stdout: "", stderr: "" }
    },
  }
  return { executor, calls }
}

describe("parseMediaControlPayload", () => {
  it("maps a media-control payload onto MediaStatus", async () => {
    const { parseMediaControlPayload } = await import("../darwin")
    expect(parseMediaControlPayload(MEDIA_CONTROL_JSON)).toEqual({
      track: {
        name: "DREAM - Live Version",
        artist: "BABYMONSTER",
        album: "HELLO MONSTERS",
      },
      totalTime: 224.026,
      currentTime: 107.53,
      playStatus: "pause",
    })
  })

  it("prefers elapsedTimeNow over the stale elapsedTime", async () => {
    const { parseMediaControlPayload } = await import("../darwin")
    expect(parseMediaControlPayload(MEDIA_CONTROL_JSON)?.currentTime).toBe(
      107.53,
    )
  })

  it("reports play when the payload says playing", async () => {
    const { parseMediaControlPayload } = await import("../darwin")
    const json = JSON.stringify({ title: "t", playing: true })
    expect(parseMediaControlPayload(json)?.playStatus).toBe("play")
  })

  it("treats a missing title as nothing loaded", async () => {
    const { parseMediaControlPayload } = await import("../darwin")
    const out = parseMediaControlPayload(JSON.stringify({ playing: true }))
    expect(out?.track).toBeNull()
    expect(out?.playStatus).toBe("unavailable")
  })

  it("returns null on non-JSON output", async () => {
    const { parseMediaControlPayload } = await import("../darwin")
    expect(parseMediaControlPayload("not json")).toBeNull()
  })
})

describe("createDarwinProvider with media-control", () => {
  it("reads playback from any app without enumerating processes", async () => {
    const { executor, calls } = makeHelperExecutor({})
    const status = await createDarwinProvider({ executor }).getStatus()
    expect(status.track?.name).toBe("DREAM - Live Version")
    expect(status.volume).toBe(0.44)
    // The helper is system-wide, so the AppleScript player hunt is skipped.
    expect(
      calls.some((c) => c.join(" ").includes("every process whose background")),
    ).toBe(false)
  })

  it("routes transport commands through the helper", async () => {
    const { executor, calls } = makeHelperExecutor({})
    const p = createDarwinProvider({ executor })
    await p.toggle()
    await p.next()
    await p.previous()
    const flat = calls.map((c) => c.join(" "))
    expect(flat).toContain("media-control toggle-play-pause")
    expect(flat).toContain("media-control next-track")
    expect(flat).toContain("media-control previous-track")
  })

  it("falls back to AppleScript players when the helper is not functional", async () => {
    // `media-control test` exits non-zero when MediaRemote is unavailable.
    const { executor, calls } = makeHelperExecutor({ testExit: 1 })
    await createDarwinProvider({ executor }).getStatus()
    expect(
      calls.some((c) => c.join(" ").includes("every process whose background")),
    ).toBe(true)
  })

  it("volume still comes from the system, not the helper", async () => {
    const { executor, calls } = makeHelperExecutor({})
    await createDarwinProvider({ executor }).volumeUp(0.1)
    expect(calls.map((c) => c.join(" ")).join("\n")).toContain(
      "set volume output volume 54",
    )
  })
})
