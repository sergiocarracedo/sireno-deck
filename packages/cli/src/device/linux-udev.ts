export const UDEV_RULES = `# sireno-deck — Elgato Stream Deck udev rules
# Grants current user access to Elgato USB devices without sudo.

SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006e", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0080", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", TAG+="uaccess"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", TAG+="uaccess"
`

export class UdevPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UdevPermissionError'
  }
}

export const formatInstallInstructions = (): string =>
  `Stream Deck udev rules not installed. To install:

  sudo tee /etc/udev/rules.d/70-sireno-deck.rules > /dev/null <<'EOF'
${UDEV_RULES.trimEnd()}
EOF
  sudo udevadm control --reload-rules && sudo udevadm trigger

Then unplug and replug your Stream Deck.
`

export const installUdevRules = async (): Promise<void> => {
  throw new UdevPermissionError(
    'installUdevRules() requires running with elevated privileges; use the manual instructions from formatInstallInstructions()',
  )
}
