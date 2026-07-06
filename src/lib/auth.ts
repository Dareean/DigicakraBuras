import crypto from "crypto";
import { cookies as getCookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "digicakra-fallback-secret-2026-brida";

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: string;
}

export function signToken(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): SessionData | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(payloadB64)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
    if (decoded.exp < Date.now()) return null; // Expired

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await getCookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function logout() {
  const cookieStore = await getCookies();
  cookieStore.delete("admin_session");
}
