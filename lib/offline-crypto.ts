// Verschlüsselung der offline vorgemerkten Einträge (läuft im Browser und in Node, nur Web Crypto).
// Je Eintrag ein Einmal-Schlüsselpaar (ECDH P-256) mit dem öffentlichen Schlüssel der Person, daraus per HKDF ein
// AES-256-GCM-Schlüssel. Verschlüsseln braucht nur den öffentlichen Schlüssel (darf auf dem Gerät liegen), Lesen den
// privaten – den gibt es nur vom Server, mit Sitzung, und er bleibt im Arbeitsspeicher.

export type SealedValue = { v: 1; epk: JsonWebKey; iv: string; data: string };

const subtle = () => globalThis.crypto.subtle;
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const INFO = new TextEncoder().encode("carecore-offline-v1");

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export const importPublicKey = (jwk: JsonWebKey) => subtle().importKey("jwk", jwk, ECDH, false, []);
// Nicht exportierbar: das Skript kann den privaten Schlüssel nutzen, aber nicht auslesen oder speichern.
export const importPrivateKey = (jwk: JsonWebKey) => subtle().importKey("jwk", jwk, ECDH, false, ["deriveBits"]);

async function aesKey(privateKey: CryptoKey, publicKey: CryptoKey, usage: KeyUsage) {
  const shared = await subtle().deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const material = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: INFO },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function seal(publicKey: CryptoKey, value: unknown): Promise<SealedValue> {
  const ephemeral = (await subtle().generateKey(ECDH, true, ["deriveBits"])) as CryptoKeyPair;
  const key = await aesKey(ephemeral.privateKey, publicKey, "encrypt");
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const data = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, plain));
  const epk = await subtle().exportKey("jwk", ephemeral.publicKey);
  return { v: 1, epk: { kty: epk.kty, crv: epk.crv, x: epk.x, y: epk.y }, iv: toBase64(iv), data: toBase64(data) };
}

export async function unseal<T>(privateKey: CryptoKey, sealed: SealedValue): Promise<T> {
  const key = await aesKey(privateKey, await importPublicKey(sealed.epk), "decrypt");
  const plain = await subtle().decrypt({ name: "AES-GCM", iv: fromBase64(sealed.iv) }, key, fromBase64(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export const isSealed = (value: unknown): value is SealedValue =>
  !!value &&
  typeof value === "object" &&
  (value as SealedValue).v === 1 &&
  typeof (value as SealedValue).data === "string";
