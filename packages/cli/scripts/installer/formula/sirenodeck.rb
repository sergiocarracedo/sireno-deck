class Sirenodeck < Formula
  desc "Config-driven Stream Deck controller"
  homepage "https://github.com/sergiocarracedo/sireno-deck"
  url "RELEASE_URL"
  sha256 "SHA256"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*"]
    system "npm", "install", "--prefix", libexec,
           "--omit=dev", "--ignore-scripts=false", "--legacy-peer-deps"
    bin.install_symlink libexec/"bin/sirenodeck.js" => "sirenodeck"
  end

  test do
    system bin/"sirenodeck", "--version"
  end
end
