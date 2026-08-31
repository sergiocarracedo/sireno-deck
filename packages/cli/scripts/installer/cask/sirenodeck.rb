# Template for the sergiocarracedo/homebrew-tap cask. macos.sh renders it with
# VERSION/SHA256 substituted. Tag URL must exist before the tap is usable.
cask "io.sireno.sirenodeck" do
  version "VERSION"
  sha256 "SHA256"

  url "https://github.com/sireno-deck/sireno-deck/releases/download/v#{version}/sirenodeck-#{version}-macos-x64.dmg"
  name "SirenoDeck"
  desc "Config-driven Stream Deck controller"
  homepage "https://github.com/sergiocarracedo/sireno-deck"

  app "SirenoDeck.app"

  caveats <<~EOS
    First launch is unsigned: right-click the app and choose Open, or use
    `xattr -dr com.apple.quarantine /Applications/SirenoDeck.app`.
  EOS
end
