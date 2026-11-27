import "reflect-metadata"
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  webcrypto,
  X509Certificate as NodeCertificate,
} from "node:crypto"
import {
  chmod,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises"
import { isIP } from "node:net"
import { join } from "node:path"
import * as x509 from "@peculiar/x509"

const crypto = webcrypto as unknown as Crypto
const algorithm = { name: "ECDSA", namedCurve: "P-256" }
const signingAlgorithm = { name: "ECDSA", hash: "SHA-256" }
const serial = () => randomBytes(16).toString("hex")
const pem = (label: string, data: ArrayBuffer) =>
  `-----BEGIN ${label}-----\n${Buffer.from(data)
    .toString("base64")
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END ${label}-----\n`

export async function ensureRemoteCertificates(
  root: string,
  addresses: readonly string[],
) {
  const dir = join(root, "remote-tls")
  await mkdir(dir, { recursive: true, mode: 0o700 })
  if (process.platform !== "win32") await chmod(dir, 0o700)
  const lockPath = join(dir, "provision.lock")
  const lock = await open(lockPath, "wx", 0o600)
  try {
    return await provisionCertificates(dir, addresses)
  } finally {
    await lock.close()
    await unlink(lockPath)
  }
}

async function atomicWrite(path: string, contents: string) {
  const temporary = `${path}.${randomBytes(12).toString("hex")}.tmp`
  try {
    await writeFile(temporary, contents, { mode: 0o600, flag: "wx" })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch(() => {})
  }
}

async function provisionCertificates(
  dir: string,
  addresses: readonly string[],
) {
  const caPath = join(dir, "ca.pem")
  const caKeyPath = join(dir, "ca-key.pem")
  const certPath = join(dir, "server.pem")
  const keyPath = join(dir, "server-key.pem")
  const names = [...new Set(["127.0.0.1", "localhost", ...addresses])]
  if (names.some((name) => isIP(name) === 0 && name !== "localhost"))
    throw new Error("Invalid remote certificate address")
  let ca: string
  let caKey: string
  try {
    ca = await readFile(caPath, "utf8")
    caKey = await readFile(caKeyPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    const keys = await crypto.subtle.generateKey(algorithm, true, [
      "sign",
      "verify",
    ])
    const now = Date.now()
    const certificate = await x509.X509CertificateGenerator.createSelfSigned(
      {
        serialNumber: serial(),
        name: "CN=Sireno Deck Local CA",
        notBefore: new Date(now - 60_000),
        notAfter: new Date(now + 10 * 365 * 86_400_000),
        signingAlgorithm,
        keys,
        extensions: [
          new x509.BasicConstraintsExtension(true, 0, true),
          new x509.KeyUsagesExtension(
            x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
            true,
          ),
        ],
      },
      crypto,
    )
    ca = certificate.toString("pem")
    caKey = pem(
      "PRIVATE KEY",
      await crypto.subtle.exportKey("pkcs8", keys.privateKey),
    )
    await writeFile(caKeyPath, caKey, { mode: 0o600, flag: "wx" })
    await writeFile(caPath, ca, { mode: 0o600, flag: "wx" })
  }
  if (process.platform !== "win32") await chmod(caKeyPath, 0o600)
  const caCert = new NodeCertificate(ca)
  if (
    !caCert.ca ||
    Date.parse(caCert.validTo) <= Date.now() ||
    !createPublicKey(createPrivateKey(caKey)).equals(caCert.publicKey)
  )
    throw new Error("Invalid local certificate authority")
  const valid = await (async () => {
    try {
      const cert = new NodeCertificate(await readFile(certPath))
      const key = createPrivateKey(await readFile(keyPath))
      return (
        cert.verify(caCert.publicKey) &&
        createPublicKey(key).equals(cert.publicKey) &&
        Date.parse(cert.validFrom) <= Date.now() &&
        Date.parse(cert.validTo) > Date.now() + 86_400_000 &&
        names.every((name) =>
          isIP(name) ? cert.checkIP(name) : cert.checkHost(name),
        )
      )
    } catch {
      return false
    }
  })()
  if (!valid) {
    const privateKeyBytes = Buffer.from(
      caKey.replace(/-----[^-]+-----|\s/g, ""),
      "base64",
    )
    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes,
      algorithm,
      false,
      ["sign"],
    )
    const keys = await crypto.subtle.generateKey(algorithm, true, [
      "sign",
      "verify",
    ])
    const now = Date.now()
    const cert = await x509.X509CertificateGenerator.create(
      {
        serialNumber: serial(),
        subject: "CN=Sireno Deck",
        issuer: "CN=Sireno Deck Local CA",
        publicKey: keys.publicKey,
        signingKey,
        signingAlgorithm,
        notBefore: new Date(now - 60_000),
        notAfter: new Date(now + 365 * 86_400_000),
        extensions: [
          new x509.BasicConstraintsExtension(false),
          new x509.SubjectAlternativeNameExtension(
            names.map((value) => ({
              type: isIP(value) ? ("ip" as const) : ("dns" as const),
              value,
            })),
          ),
          new x509.ExtendedKeyUsageExtension(["1.3.6.1.5.5.7.3.1"]),
        ],
      },
      crypto,
    )
    await atomicWrite(
      keyPath,
      pem(
        "PRIVATE KEY",
        await crypto.subtle.exportKey("pkcs8", keys.privateKey),
      ),
    )
    await atomicWrite(certPath, cert.toString("pem"))
  }
  if (process.platform !== "win32") await chmod(keyPath, 0o600)
  return {
    caPath,
    certPath,
    keyPath,
    fingerprint: createHash("sha256").update(caCert.raw).digest("hex"),
  }
}
