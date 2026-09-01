class Sirenodeck < Formula
  desc "Config-driven Stream Deck controller"
  homepage "https://github.com/sergiocarracedo/sireno-deck"
  url "https://registry.npmjs.org/@sirenodeck/cli/-/cli-VERSION.tgz"
  sha256 "SHA256"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*"]
    system "npm", "install", "--prefix", libexec, "--omit=dev", "--ignore-scripts=false"
    bin.install_symlink libexec/"bin/sirenodeck"
  end

  test do
    system bin/"sirenodeck", "--version"
  end
end
