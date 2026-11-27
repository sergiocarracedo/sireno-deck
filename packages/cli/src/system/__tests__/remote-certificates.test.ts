import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { X509Certificate } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import { ensureRemoteCertificates } from "../remote-certificates"

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe("remote certificates", () => {
  it("persists a local trust identity and issues a certificate for the address", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-certs-"))
    directories.push(root)
    const first = await ensureRemoteCertificates(root, [
      "127.0.0.1",
      "192.0.2.10",
    ])
    const second = await ensureRemoteCertificates(root, [
      "127.0.0.1",
      "192.0.2.10",
    ])
    expect(second.fingerprint).toBe(first.fingerprint)
    const leaf = new X509Certificate(await readFile(first.certPath))
    expect(leaf.checkIP("192.0.2.10")).toBe("192.0.2.10")
    expect(
      leaf.verify(new X509Certificate(await readFile(first.caPath)).publicKey),
    ).toBe(true)
    if (process.platform !== "win32")
      expect((await stat(first.keyPath)).mode & 0o077).toBe(0)
  })

  it("keeps the trust identity when the remote address changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-certs-"))
    directories.push(root)
    const first = await ensureRemoteCertificates(root, ["192.0.2.10"])
    const next = await ensureRemoteCertificates(root, ["192.0.2.11"])
    expect(next.fingerprint).toBe(first.fingerprint)
    expect(
      new X509Certificate(await readFile(next.certPath)).checkIP("192.0.2.11"),
    ).toBe("192.0.2.11")
  })

  it("fails closed when the existing authority key is corrupted", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-certs-"))
    directories.push(root)
    await ensureRemoteCertificates(root, ["192.0.2.10"])
    await writeFile(join(root, "remote-tls", "ca-key.pem"), "invalid")
    await expect(
      ensureRemoteCertificates(root, ["192.0.2.10"]),
    ).rejects.toThrow()
  })

  it("rejects addresses that are not IPs or localhost", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-certs-"))
    directories.push(root)
    await expect(
      ensureRemoteCertificates(root, ["evil.example"]),
    ).rejects.toThrow("Invalid remote certificate address")
  })
})
