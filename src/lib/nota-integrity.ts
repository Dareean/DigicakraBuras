import crypto from "crypto";

const SECRET = process.env.NOTA_SECRET_KEY ?? "digicakra-nota-fallback-secret";

/**
 * Generate a short HMAC-SHA256 verification code for a nota.
 * The code is derived from orderCode + totalAmount on the SERVER.
 * If anyone tampers with printed values, this code will not match
 * when re-verified against the database.
 */
export function generateIntegrityCode(
  orderCode: string,
  totalAmount: number
): string {
  const payload = `${orderCode}:${Math.round(totalAmount)}`;
  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  // Return first 8 chars, uppercase → e.g. "A3F7C2D1"
  return hash.substring(0, 8).toUpperCase();
}
