import { execa } from 'execa'

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function getPlatform(): 'darwin' | 'linux' | 'win32' {
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'win32') return 'win32'
  return 'linux'
}

function powershellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

async function writeClipboard(text: string): Promise<void> {
  const platform = getPlatform()
  if (platform === 'darwin') {
    await execa('pbcopy', { input: text })
  } else if (platform === 'win32') {
    await execa(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText(${powershellQuote(text)})`,
      ],
      { input: text },
    )
  } else {
    await execa('xclip', ['-selection', 'clipboard'], { input: text })
  }
}

async function simulatePaste(): Promise<void> {
  const platform = getPlatform()
  if (platform === 'darwin') {
    await execa('osascript', [
      '-e',
      'tell application "System Events" to keystroke "v" using {command down}',
    ])
  } else if (platform === 'win32') {
    await execa('powershell', [
      '-NoProfile',
      '-Command',
      '[System.Windows.Forms.SendKeys]::SendWait("^v")',
    ])
  } else {
    await execa('xdotool', ['key', 'ctrl+v'])
  }
}

async function detectPasteTool(): Promise<boolean> {
  const platform = getPlatform()
  if (platform === 'darwin') {
    try {
      await execa('command', ['-v', 'osascript'])
      return true
    } catch {
      return false
    }
  }
  if (platform === 'win32') {
    return true // PowerShell is built-in
  }
  try {
    await execa('command', ['-v', 'xdotool'])
    return true
  } catch {
    return false
  }
}

export async function pasteText(text: string): Promise<void> {
  await writeClipboard(text)
  await simulatePaste()
}

export async function checkPasteAvailable(): Promise<boolean> {
  return detectPasteTool()
}

export { shellQuote }
