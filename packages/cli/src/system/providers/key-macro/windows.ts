import { existsSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type pino from "pino"

import { ProviderError } from "../error"
import { type CommandExecutor, withTimeout } from "../shared"
import { type KeyMacroProvider } from "../key-macro"
import { parseCombo } from "./parser"

export interface WindowsKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

const CACHE_DIR = join(tmpdir(), "sireno-deck", "key-macro-windows")
const HELPER_DLL = join(CACHE_DIR, "sirenokey-input.dll")

const HELPED_SOURCE = String.raw`
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class SirenoKey
{
    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint n, INPUT[] p, int cb);

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT { public uint type; public INPUTUNION u; }

    [StructLayout(LayoutKind.Explicit)]
    struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT k;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    const uint INPUT_KEYBOARD = 1;
    const ushort KEYEVENTF_UNICODE = 0x0004;
    const ushort KEYEVENTF_KEYUP = 0x0002;
    const ushort KEYEVENTF_EXTENDEDKEY = 0x0001;

    static bool IsExtended(ushort vk) {
        return vk == 0x21 || vk == 0x22 || vk == 0x23 || vk == 0x24
            || vk == 0x25 || vk == 0x26 || vk == 0x27 || vk == 0x28
            || vk == 0x2D || vk == 0x2E
            || vk == 0x6F || vk == 0x0D
            || vk == 0xA3 || vk == 0xA5;
    }

    static INPUT MkDown(ushort vk) {
        var i = new INPUT();
        i.type = INPUT_KEYBOARD;
        i.u.k.wVk = vk;
        i.u.k.dwFlags = (uint)(IsExtended(vk) ? KEYEVENTF_EXTENDEDKEY : 0);
        return i;
    }

    static INPUT MkUp(ushort vk) {
        var i = new INPUT();
        i.type = INPUT_KEYBOARD;
        i.u.k.wVk = vk;
        i.u.k.dwFlags = (uint)((IsExtended(vk) ? KEYEVENTF_EXTENDEDKEY : 0) | KEYEVENTF_KEYUP);
        return i;
    }

    static string Err(int expected, uint sent) {
        int err = Marshal.GetLastWin32Error();
        return "fail:" + err + ":SendInput returned " + sent + " of " + expected;
    }

    static uint Send(INPUT[] arr) {
        return SendInput((uint)arr.Length, arr, Marshal.SizeOf(typeof(INPUT)));
    }

    public static string TypeText(string s) {
        if (s == null) s = "";
        var inputs = new List<INPUT>();
        foreach (var ch in s) {
            ushort sc = (ushort)ch;
            var down = new INPUT();
            down.type = INPUT_KEYBOARD;
            down.u.k.wVk = 0;
            down.u.k.wScan = sc;
            down.u.k.dwFlags = KEYEVENTF_UNICODE;
            inputs.Add(down);
            var up = new INPUT();
            up.type = INPUT_KEYBOARD;
            up.u.k.wVk = 0;
            up.u.k.wScan = sc;
            up.u.k.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            inputs.Add(up);
        }
        var arr = inputs.ToArray();
        if (arr.Length == 0) return "ok:0:";
        uint sent = Send(arr);
        if (sent != arr.Length) return Err(arr.Length, sent);
        return "ok:0:";
    }

    public static string TapKey(ushort vk) {
        var arr = new INPUT[] { MkDown(vk), MkUp(vk) };
        uint sent = Send(arr);
        if (sent != (uint)arr.Length) return Err(arr.Length, sent);
        return "ok:0:";
    }

    public static string KeyDown(ushort vk) {
        var arr = new INPUT[] { MkDown(vk) };
        uint sent = Send(arr);
        if (sent != (uint)arr.Length) return Err(arr.Length, sent);
        return "ok:0:";
    }

    public static string KeyUp(ushort vk) {
        var arr = new INPUT[] { MkUp(vk) };
        uint sent = Send(arr);
        if (sent != (uint)arr.Length) return Err(arr.Length, sent);
        return "ok:0:";
    }
}
`

const COMPILE_PS = (
  cacheDir: string,
  dllPath: string,
): string => `
$ErrorActionPreference = 'Stop'
$src = @'
${HELPED_SOURCE}
'@
try {
    Add-Type -TypeDefinition $src -Language CSharp
    $asm = [SirenoKey].Assembly.Location
    if (-not (Test-Path '${escapeForPSSingleQuote(cacheDir)}')) {
        New-Item -ItemType Directory -Path '${escapeForPSSingleQuote(cacheDir)}' -Force | Out-Null
    }
    Copy-Item -Path $asm -Destination '${escapeForPSSingleQuote(dllPath)}' -Force
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
`

const escapeForPSSingleQuote = (s: string): string =>
  s.replace(/'/g, "''")

const encodePSCommand = (script: string): string => {
  const buf = Buffer.from(script, "utf16le")
  return buf.toString("base64")
}

const VK_CONTROL = 0x11
const VK_SHIFT = 0x10
const VK_MENU = 0x12
const VK_LWIN = 0x5b

const VK_NAMED: ReadonlyMap<string, number> = new Map<string, number>([
  ["Return", 0x0d],
  ["Tab", 0x09],
  ["Escape", 0x1b],
  ["BackSpace", 0x08],
  ["Delete", 0x2e],
  ["Insert", 0x2d],
  ["Home", 0x24],
  ["End", 0x23],
  ["Page_Up", 0x21],
  ["Page_Down", 0x22],
  ["Up", 0x26],
  ["Down", 0x28],
  ["Left", 0x25],
  ["Right", 0x27],
  ["space", 0x20],
  ["F1", 0x70],
  ["F2", 0x71],
  ["F3", 0x72],
  ["F4", 0x73],
  ["F5", 0x74],
  ["F6", 0x75],
  ["F7", 0x76],
  ["F8", 0x77],
  ["F9", 0x78],
  ["F10", 0x79],
  ["F11", 0x7a],
  ["F12", 0x7b],
  ["F13", 0x7c],
  ["F14", 0x7d],
  ["F15", 0x7e],
  ["F16", 0x7f],
  ["F17", 0x80],
  ["F18", 0x81],
  ["F19", 0x82],
  ["F20", 0x83],
  ["F21", 0x84],
  ["F22", 0x85],
  ["F23", 0x86],
  ["F24", 0x87],
  ["Caps_Lock", 0x14],
  ["Num_Lock", 0x90],
  ["Scroll_Lock", 0x91],
  ["Pause", 0x13],
  ["Menu", 0x5d],
  ["Print", 0x2a],
])

const MOD_TO_VK: ReadonlyMap<string, number> = new Map<string, number>([
  ["ctrl", VK_CONTROL],
  ["shift", VK_SHIFT],
  ["alt", VK_MENU],
  ["meta", VK_LWIN],
  ["super", VK_LWIN],
  ["hyper", VK_LWIN],
])

const MOD_ORDER: ReadonlyArray<string> = ["ctrl", "alt", "shift", "super"]

const modToVk = (mod: string): number | null => MOD_TO_VK.get(mod) ?? null

const keyToVk = (key: string): number | null => {
  const named = VK_NAMED.get(key)
  if (named !== undefined) return named
  if (key.length === 1) {
    const code = key.charCodeAt(0)
    if (code >= 0x61 && code <= 0x7a) return code - 0x20
    if (code >= 0x30 && code <= 0x39) return code
  }
  return null
}

const escapeForPSDoubleQuote = (s: string): string =>
  s.replace(/[\\"$`]/g, "``$&")

interface CompiledHelper {
  readonly dllPath: string
}

const compileHelper = async (
  deps: WindowsKeyMacroDeps,
): Promise<CompiledHelper | null> => {
  if (!existsSync(CACHE_DIR)) {
    try {
      mkdirSync(CACHE_DIR, { recursive: true })
    } catch (err) {
      deps.logger.warn(
        { err, cacheDir: CACHE_DIR },
        "windows key-macro: failed to create cache dir",
      )
      return null
    }
  }
  const script = COMPILE_PS(CACHE_DIR, HELPER_DLL)
  const encoded = encodePSCommand(script)
  try {
    const result = await deps.executor.run("powershell", [
      "-NoProfile",
      "-EncodedCommand",
      encoded,
    ])
    if (result.exitCode !== 0) {
      deps.logger.warn(
        { stderr: result.stderr.trim() },
        "windows key-macro: helper compile failed",
      )
      return null
    }
  } catch (err) {
    deps.logger.warn(
      { err },
      "windows key-macro: helper compile threw",
    )
    return null
  }
  if (!existsSync(HELPER_DLL)) {
    deps.logger.warn(
      { dllPath: HELPER_DLL },
      "windows key-macro: helper DLL missing after compile",
    )
    return null
  }
  return { dllPath: HELPER_DLL }
}

const buildTypeTextPS = (dllPath: string, text: string): string => {
  const escapedText = escapeForPSDoubleQuote(text)
  return `[Reflection.Assembly]::LoadFrom('${escapeForPSSingleQuote(dllPath)}') | Out-Null
$r = [SirenoKey]::TypeText("${escapedText}")
Write-Output $r
`
}

const buildComboPS = (
  dllPath: string,
  orderedMods: ReadonlyArray<number>,
  keyVk: number,
): string => {
  const dllEsc = escapeForPSSingleQuote(dllPath)
  const lines: string[] = []
  lines.push(`[Reflection.Assembly]::LoadFrom('${dllEsc}') | Out-Null`)
  for (const vk of orderedMods) {
    lines.push(`$null = [SirenoKey]::KeyDown(${vk})`)
  }
  lines.push(`$null = [SirenoKey]::TapKey(${keyVk})`)
  for (const vk of [...orderedMods].reverse()) {
    lines.push(`$null = [SirenoKey]::KeyUp(${vk})`)
  }
  lines.push(`Write-Output 'ok:0:'`)
  return lines.join("\n") + "\n"
}

interface SendInputResponse {
  readonly ok: boolean
  readonly win32: number
  readonly message: string
}

const parseResponse = (stdout: string): SendInputResponse | null => {
  const m = stdout.match(/^(ok|fail):(\d+):(.*)$/)
  if (m === null) return null
  return {
    ok: m[1] === "ok",
    win32: Number(m[2]),
    message: m[3] ?? "",
  }
}

const sendViaPowerShell = async (
  script: string,
  deps: WindowsKeyMacroDeps,
): Promise<SendInputResponse> => {
  const timeoutMs = deps.timeoutMs ?? 500
  const encoded = encodePSCommand(script)
  const result = await withTimeout(
    deps.executor.run("powershell", [
      "-NoProfile",
      "-EncodedCommand",
      encoded,
    ]),
    timeoutMs + 2500,
  )
  if (result.exitCode !== 0) {
    throw new ProviderError(
      "EXEC_FAILED",
      `powershell exited ${result.exitCode}: ${result.stderr.trim() || result.stdout.trim()}`,
    )
  }
  const parsed = parseResponse(result.stdout.trim())
  if (parsed === null) {
    throw new ProviderError(
      "EXEC_FAILED",
      `unexpected SendInput response: ${result.stdout.trim().slice(0, 200)}`,
    )
  }
  if (!parsed.ok) {
    throw new ProviderError(
      "EXEC_FAILED",
      `SendInput failed (Win32 #${parsed.win32}): ${parsed.message}`,
    )
  }
  return parsed
}

export const createWindowsKeyMacroProvider = async (
  deps: WindowsKeyMacroDeps,
): Promise<KeyMacroProvider> => {
  const helper = await compileHelper(deps)
  if (helper === null) {
    return {
      async sendKey(_input: string) {
        throw new ProviderError(
          "NOT_AVAILABLE",
          "Windows key-macro unavailable: failed to compile SendInput helper (PowerShell Add-Type failed). Check that PowerShell 5+ is on PATH and user32.dll is reachable.",
        )
      },
      async stop() {
        return
      },
    }
  }

  deps.logger.info(
    { dllPath: helper.dllPath },
    "Windows key-macro provider initialised (Win32 SendInput)",
  )

  return {
    async sendKey(input: string) {
      const parsed = parseCombo(input)
      if (parsed !== null) {
        const seen = new Set<string>()
        const orderedMods: number[] = []
        for (const mod of MOD_ORDER) {
          if (parsed.mods.includes(mod) && !seen.has(mod)) {
            const vk = modToVk(mod)
            if (vk === null) {
              throw new ProviderError(
                "EXEC_FAILED",
                `windows: cannot map modifier '${mod}' to VK code`,
              )
            }
            seen.add(mod)
            orderedMods.push(vk)
          }
        }
        for (const mod of parsed.mods) {
          if (seen.has(mod)) continue
          const vk = modToVk(mod)
          if (vk === null) {
            throw new ProviderError(
              "EXEC_FAILED",
              `windows: cannot map modifier '${mod}' to VK code`,
            )
          }
          seen.add(mod)
          orderedMods.push(vk)
        }
        const keyVk = keyToVk(parsed.key)
        if (keyVk === null) {
          throw new ProviderError(
            "EXEC_FAILED",
            `windows: cannot map key '${parsed.key}' to VK code (combo keys must be alphanumeric or a named key)`,
          )
        }
        const script = buildComboPS(helper.dllPath, orderedMods, keyVk)
        await sendViaPowerShell(script, deps)
        return
      }
      const script = buildTypeTextPS(helper.dllPath, input)
      await sendViaPowerShell(script, deps)
    },
    async stop() {
      return
    },
  }
}
