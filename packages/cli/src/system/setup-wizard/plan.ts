import { UDEV_RULES } from "../../device/linux-udev"
import { EXTENSION_INSTALL_URL } from "../providers/active-app/wayland-gnome"
import {
  type CapabilityName,
  type InstallStep,
  type PackageManager,
  type SystemReport,
  UDEV_RULES_PATH,
} from "./types"

interface PackageMap {
  readonly apt: ReadonlyArray<string>
  readonly dnf: ReadonlyArray<string>
  readonly pacman: ReadonlyArray<string>
  readonly zypper: ReadonlyArray<string>
  readonly brew: ReadonlyArray<string>
}

const KEYMACRO_PACKAGES: PackageMap = {
  apt: ["ydotool"],
  dnf: ["ydotool"],
  pacman: ["ydotool"],
  zypper: ["ydotool"],
  brew: [],
}

const CLIPBOARD_WAYLAND_PACKAGES: PackageMap = {
  apt: ["wl-clipboard"],
  dnf: ["wl-clipboard"],
  pacman: ["wl-clipboard"],
  zypper: ["wl-clipboard"],
  brew: [],
}

const CLIPBOARD_X11_PACKAGES: PackageMap = {
  apt: ["xclip"],
  dnf: ["xclip"],
  pacman: ["xclip"],
  zypper: ["xclip"],
  brew: [],
}

const NOTIFICATION_PACKAGES: PackageMap = {
  apt: ["libnotify-bin"],
  dnf: ["libnotify"],
  pacman: ["libnotify"],
  zypper: ["libnotify"],
  brew: [],
}

const ACTIVEAPP_X11_PACKAGES: PackageMap = {
  apt: ["xdotool", "x11-utils"],
  dnf: ["xdotool", "xorg-x11-utils"],
  pacman: ["xdotool"],
  zypper: ["xdotool"],
  brew: [],
}

const resolvePackages = (
  map: PackageMap,
  pm: PackageManager,
): ReadonlyArray<string> => {
  if (pm === "none") return []
  return map[pm]
}

const capId = (name: CapabilityName): string => `cap:${name}`

const udevInstruction = (rulesPath: string): string =>
  `sudo tee ${rulesPath} > /dev/null <<'EOF'
${UDEV_RULES.trimEnd()}
EOF
sudo udevadm control --reload-rules && sudo udevadm trigger`

const buildCapabilityStep = (
  name: CapabilityName,
  title: string,
  description: string,
  packages: ReadonlyArray<string>,
  pm: PackageManager,
  verifyCommand: string,
): InstallStep => ({
  id: capId(name),
  capability: name,
  title,
  description,
  packageManager: pm,
  packages,
  sudo: pm !== "brew",
  manualOnly: packages.length === 0,
  manualInstructions:
    packages.length === 0
      ? `No supported package manager found for this platform. Install ${name} manually for your distro.`
      : pm === "none"
        ? `No package manager detected. Install manually: ${packages.join(", ")}.`
        : "",
  ...(verifyCommand.length > 0 ? { verifyCommand } : {}),
})

const buildUdevStep = (streamDeckConnected: boolean): InstallStep => ({
  id: "udev:rules",
  capability: "udev",
  title: "Stream Deck udev rules",
  description: streamDeckConnected
    ? "Stream Deck detected but udev rules are missing. Without them, the daemon can't access the device without sudo."
    : "Install udev rules so a Stream Deck can be accessed without sudo when you plug one in.",
  packageManager: "none",
  packages: [],
  sudo: true,
  manualOnly: false,
  manualInstructions: udevInstruction(UDEV_RULES_PATH),
  verifyCommand: `test -f ${UDEV_RULES_PATH} && echo installed || echo missing`,
})

const buildGnomeExtensionStep = (): InstallStep => ({
  id: "cap:activeApp:gnome-extension",
  capability: "activeApp",
  title: "GNOME 'Window Calls Extended' extension",
  description: `Wayland GNOME requires this extension for active-app detection. Install from ${EXTENSION_INSTALL_URL}.`,
  packageManager: "none",
  packages: [],
  sudo: false,
  manualOnly: true,
  manualInstructions: `Open ${EXTENSION_INSTALL_URL} in your browser, toggle the extension ON, then log out / log in (or restart GNOME Shell).`,
  verifyCommand: undefined,
})

export const buildInstallPlan = (report: SystemReport): InstallStep[] => {
  const steps: InstallStep[] = []
  const { platform, session, packageManager, capabilities, udev } = report

  if (capabilities.keyMacro.missing.length > 0 && platform === "linux") {
    steps.push(
      buildCapabilityStep(
        "keyMacro",
        "Key macro tool (ydotool)",
        capabilities.keyMacro.reason,
        resolvePackages(KEYMACRO_PACKAGES, packageManager),
        packageManager,
        "which ydotool || which wtype || which xdotool",
      ),
    )
  }

  if (capabilities.clipboard.missing.length > 0 && platform === "linux") {
    const map =
      session === "wayland"
        ? CLIPBOARD_WAYLAND_PACKAGES
        : CLIPBOARD_X11_PACKAGES
    steps.push(
      buildCapabilityStep(
        "clipboard",
        session === "wayland" ? "wl-clipboard (wl-copy)" : "xclip",
        capabilities.clipboard.reason,
        resolvePackages(map, packageManager),
        packageManager,
        session === "wayland" ? "which wl-copy" : "which xclip",
      ),
    )
  }

  if (capabilities.notification.missing.length > 0 && platform === "linux") {
    steps.push(
      buildCapabilityStep(
        "notification",
        "Notification tool (notify-send)",
        capabilities.notification.reason,
        resolvePackages(NOTIFICATION_PACKAGES, packageManager),
        packageManager,
        "which notify-send",
      ),
    )
  }

  if (capabilities.activeApp.missing.length > 0 && platform === "linux") {
    if (session === "wayland") {
      steps.push(buildGnomeExtensionStep())
    } else if (session === "x11") {
      steps.push(
        buildCapabilityStep(
          "activeApp",
          "Active-app detection (xdotool, xprop)",
          capabilities.activeApp.reason,
          resolvePackages(ACTIVEAPP_X11_PACKAGES, packageManager),
          packageManager,
          "which xdotool",
        ),
      )
    }
  }

  if (platform === "linux" && !udev.rulesInstalled) {
    steps.push(buildUdevStep(udev.streamDeckConnected))
  }

  return steps
}

export const needsConfigSeed = (report: SystemReport): boolean =>
  !report.config.exists
