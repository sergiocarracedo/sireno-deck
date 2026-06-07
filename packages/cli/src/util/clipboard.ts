import clipboardy from 'clipboardy'

export async function pasteText(text: string): Promise<void> {
  await clipboardy.write(text)
}

export async function checkPasteAvailable(): Promise<boolean> {
  try {
    await clipboardy.write('')
    return true
  } catch {
    return false
  }
}