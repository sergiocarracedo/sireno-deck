import clipboardy from 'clipboardy'
import { parseKeyMacro } from '../system/key-macro/parser.js'
import type { KeyMacroProvider } from '../system/key-macro/provider.js'

export async function pasteText(
  text: string,
  keyMacroProvider?: KeyMacroProvider,
): Promise<void> {
  clipboardy.writeSync(text)
  if (keyMacroProvider) {
    await keyMacroProvider.send(parseKeyMacro('ctrl+v'))
  }
}

export async function checkPasteAvailable(): Promise<boolean> {
  try {
    await clipboardy.write('')
    return true
  } catch {
    return false
  }
}