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
    // The darwin provider always begins by enumerating processes.
    expect(seen[0]).toBe("osascript")
  })
})
