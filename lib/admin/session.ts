/**
 * Stateless admin session: cookie value = "<expiresAtMs>.<hmac>".
 * Uses Web Crypto so it works both in proxy.ts and in server actions.
 */
export const ADMIN_COOKIE = "kl_vpr_admin";
export const ADMIN_SESSION_HOURS = 12;

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function createSessionToken(): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const exp = String(Date.now() + ADMIN_SESSION_HOURS * 3600_000);
  return `${exp}.${await hmac(exp, s)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const s = secret();
  if (!s || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(exp, s);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Constant-time password comparison. */
export async function checkPassword(input: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  const s = secret();
  if (!pw || !s) return false;
  const [a, b] = await Promise.all([hmac(input, s), hmac(pw, s)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
