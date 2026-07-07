import type {
  MediaStatus,
  MediaStatusProvider,
  ProviderExecutor,
} from "./types";

interface WindowsDeps {
  readonly executor: ProviderExecutor;
}

const runPowerShell = async (
  deps: WindowsDeps,
  script: string,
): Promise<void> => {
  const result = await deps.executor.run(
    "powershell",
    ["-NoProfile", "-Command", script],
    { timeoutMs: 5_000 },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `powershell failed: ${result.stderr.trim() || "exit " + result.exitCode}`,
    );
  }
};

const PS_GET_STATE = `(Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1 -ExpandProperty ProcessName) 2>$null`;
const PS_GET_TRACK = `try { $m = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult().GetCurrentSession().GetMediaPropertiesAsync().GetAwaiter().GetResult(); "{0}|{1}|{2}" -f $m.Title, $m.Artist, $m.AlbumTitle } catch { "" }`;
const PS_PLAY = `Add-Type -AssemblyName System.Runtime.WindowsRuntime; $null = [Windows.System.User, Windows.System, ContentType=WindowsRuntime]; $smtc = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult(); $null = $smtc.GetCurrentSession().TryPlayAsync().GetAwaiter().GetResult()`;
const PS_PAUSE = `$smtc = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult(); $null = $smtc.GetCurrentSession().TryPauseAsync().GetAwaiter().GetResult()`;
const PS_TOGGLE = `$smtc = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult(); $null = $smtc.GetCurrentSession().TryTogglePlayPauseAsync().GetAwaiter().GetResult()`;

const readStatus = async (deps: WindowsDeps): Promise<MediaStatus> => {
  const [stateResult, trackResult] = await Promise.all([
    deps.executor.run("powershell", ["-NoProfile", "-Command", PS_GET_STATE], {
      timeoutMs: 2_000,
    }),
    deps.executor.run("powershell", ["-NoProfile", "-Command", PS_GET_TRACK], {
      timeoutMs: 2_000,
    }),
  ]);

  // SMTC does not expose a distinct play/pause/stop status. We use the
  // presence of a foreground media process as a proxy for "playing"; a real
  // session manager would expose PlaybackStatus but the underlying Windows
  // Media Control API does not surface it through PowerShell here.
  const playStatus: MediaStatus["playStatus"] =
    stateResult.exitCode === 0 && stateResult.stdout.trim().length > 0
      ? "play"
      : "stop";

  const track =
    trackResult.exitCode === 0 && trackResult.stdout.trim().length > 0
      ? (() => {
          const parts = trackResult.stdout.trim().split("|");
          const name = (parts[0] ?? "").trim();
          if (name.length === 0) return null;
          return {
            name,
            artist: parts[1] !== undefined && parts[1].trim().length > 0 ? parts[1].trim() : "",
            album:
              parts[2] !== undefined && parts[2].trim().length > 0 ? parts[2].trim() : undefined,
          };
        })()
      : null;

  return {
    track,
    totalTime: 0,
    currentTime: 0,
    playStatus,
    volume: 1,
    muted: false,
  };
};

export const createWindowsProvider = (
  deps: WindowsDeps,
): MediaStatusProvider => {
  return {
    async getStatus() {
      return readStatus(deps);
    },

    async play() {
      await runPowerShell(deps, PS_PLAY);
    },
    async pause() {
      await runPowerShell(deps, PS_PAUSE);
    },
    async toggle() {
      await runPowerShell(deps, PS_TOGGLE);
    },
    async next() {
      // SMTC doesn't expose next/previous directly.
    },
    async previous() {
      // SMTC doesn't expose next/previous directly.
    },

    async setVolume(_value) {
      // SMTC doesn't support volume control.
    },
    async volumeUp(_step) {
      // SMTC doesn't support volume control.
    },
    async volumeDown(_step) {
      // SMTC doesn't support volume control.
    },
    async toggleMute() {
      // SMTC doesn't support mute.
    },
  };
};