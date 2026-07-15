/**
 * @file src/lib/midtrans.ts
 * @description Singleton Midtrans Core API client.
 *
 * Pola ini identik dengan src/lib/prisma.ts — satu instance global
 * agar tidak membuat koneksi baru di setiap API request.
 *
 * Docs: https://github.com/Midtrans/midtrans-client-nodejs
 */

import MidtransClient from "midtrans-client";

// ─── Env Validation ──────────────────────────────────────────────────────────

const SERVER_KEY = process.env.NEXT_MIDTRANS_SERVER_KEY;
const CLIENT_KEY = process.env.NEXT_MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = process.env.NEXT_MIDTRANS_IS_PRODUCTION === "true";

if (!SERVER_KEY || !CLIENT_KEY) {
  throw new Error(
    "[Midtrans] NEXT_MIDTRANS_SERVER_KEY dan NEXT_MIDTRANS_CLIENT_KEY harus diisi di .env"
  );
}

// ─── Singleton Pattern ────────────────────────────────────────────────────────

/**
 * Core API — untuk charge transaksi QRIS secara programatik.
 * Gunakan ini saat butuh render QR sendiri di UI custom.
 */
const coreApi = new MidtransClient.CoreApi({
  isProduction: IS_PRODUCTION,
  serverKey: SERVER_KEY,
  clientKey: CLIENT_KEY,
});

// Export config publik yang aman dipakai di client-side (tanpa server key)
export const midtransConfig = {
  isProduction: IS_PRODUCTION,
  clientKey: CLIENT_KEY,
} as const;

export { coreApi };
