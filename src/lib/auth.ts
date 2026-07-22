import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "digicakra-fallback-secret-2026-brida";

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: string;
}

async function createHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signToken(data: SessionData): Promise<string> {
  const payload = btoa(
    JSON.stringify({
      ...data,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    })
  );
  const signature = await createHmacSha256(JWT_SECRET, payload);
  return `${payload}.${signature}`;
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSignature = await createHmacSha256(JWT_SECRET, payloadB64);
    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(atob(payloadB64));
    if (decoded.exp < Date.now()) return null;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}
