# Rencana Deploy Digicakra ke Cloudflare Free Tier

## Arsitektur Final

```
Browser ──► Cloudflare Pages ──► Pages Functions (Next.js API Routes)
                │                        │
                │                        ├──► Supabase PostgreSQL (database via @prisma/adapter-neon)
                │                        └──► Supabase Storage (file docs/images via supabase-js)
                │
                └──► Static Assets (HTML/CSS/JS, cached at edge)
```

## Daftar Perubahan

### 1. Upgrade Next.js 16.2.10 → 16.2.11
**Alasan:** `@opennextjs/cloudflare` v1.20.2 require `next >=16.2.11`

```bash
npm install next@16.2.11 eslint-config-next@16.2.11
```

### 2. Install Packages Baru
```bash
npm install @opennextjs/cloudflare @prisma/adapter-neon @neondatabase/serverless
```

### 3. Update Prisma Schema (`prisma/schema.prisma`)
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

Hapus `directUrl = env("DIRECT_URL")` — tidak diperlukan lagi.

### 4. Generate Prisma Client Baru
```bash
npx prisma generate
```

### 5. Update `src/lib/db.ts` (ganti PrismaClient init untuk edge)
```typescript
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool } from "@neondatabase/serverless"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### 6. Update `src/lib/auth.ts` — Ganti crypto Node.js → Web Crypto API
```typescript
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
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signToken(data: SessionData): Promise<string> {
  const payload = btoa(JSON.stringify({
    ...data,
    userId: data.userId,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }));
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
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function logout() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}
```

### 7. Update `src/lib/storage.ts` — Ganti Buffer → Uint8Array
```typescript
// Ganti:
const buffer = Buffer.from(await file.arrayBuffer());
// Jadi:
const buffer = new Uint8Array(await file.arrayBuffer());
```

### 8. Update `src/lib/midtrans.ts` — Import dinamis di dalam fungsi
**Alasan:** file ini di-include di top-level, tapi midtrans-client pakai Node.js module (`net`, `tls`). Harus lazy-load agar tidak crash di edge runtime saat file di-import.

```typescript
let _coreApi: any = null

export async function getCoreApi() {
  if (!_coreApi) {
    const MidtransClient = await import("midtrans-client").then((m) => m.default || m);
    const SERVER_KEY = process.env.NEXT_MIDTRANS_SERVER_KEY;
    const CLIENT_KEY = process.env.NEXT_MIDTRANS_CLIENT_KEY;
    const IS_PRODUCTION = process.env.NEXT_MIDTRANS_IS_PRODUCTION === "true";
    if (!SERVER_KEY || !CLIENT_KEY) {
      throw new Error("[Midtrans] Server key dan client key harus diisi di .env");
    }
    _coreApi = new MidtransClient.CoreApi({
      isProduction: IS_PRODUCTION,
      serverKey: SERVER_KEY,
      clientKey: CLIENT_KEY,
    });
  }
  return _coreApi;
}

export const midtransConfig = {
  isProduction: process.env.NEXT_MIDTRANS_IS_PRODUCTION === "true",
  clientKey: process.env.NEXT_MIDTRANS_CLIENT_KEY || "",
} as const;
```

**PENTING:** Update semua file yang import `coreApi` dari `@/lib/midtrans` menjadi `const { coreApi } = await import("@/lib/midtrans")` atau panggil `await getCoreApi()`.

File yang perlu diupdate:
- `src/lib/midtrans.ts` → export `getCoreApi()` + hapus `coreApi` export langsung
- `src/app/api/payments/[orderId]/generate-qr/route.ts`
- `src/app/api/payments/[orderId]/check-status/route.ts`
- `src/app/api/payments/webhook/midtrans/route.ts`

### 9. Update `src/app/api/payments/webhook/midtrans/route.ts` — Ganti crypto Node.js
```typescript
// Ganti:
import crypto from "crypto";
// Jadi:
async function verifyMidtransSignature(notification: any): Promise<boolean> {
  const serverKey = process.env.NEXT_MIDTRANS_SERVER_KEY || "";
  const hashString =
    notification.order_id +
    notification.status_code +
    notification.gross_amount +
    serverKey;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(serverKey),
    { name: "HMAC", hash: "SHA-512" },
    false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(hashString));
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === notification.signature_key;
}
```

### 10. Update `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default nextConfig;
```

### 11. Buat `src/lib/image-loader.ts`
```typescript
export default function cloudflareImageLoader({ src }: { src: string }) {
  return src;
}
```

### 12. Buat `wrangler.toml`
```toml
name = "digicakra"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[[services]]
binding = "SUPABASE_URL"
service = "supabase"

[[d1_databases]]
binding = "DB"
database_name = "digicakra"
database_id = "your-d1-database-id"
```

### 13. Update `package.json` — Tambah script deploy
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "cf:build": "next build && npx @opennextjs/cloudflare",
  "cf:deploy": "npx wrangler pages deploy .vercel/output/static --branch production"
}
```

### 14. Update `.gitignore` — Tambah:
```gitignore
# cloudflare
.wrangler
worker-configuration.d.ts
```

### 15. Hapus `prisma/dev.db` dari git tracking
```bash
git rm --cached prisma/dev.db
```

## Environment Variables

Di dashboard Cloudflare Pages → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Connection string PostgreSQL dari Supabase (pakai pooled URL `:6543`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Dari Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dari Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Dari Supabase dashboard |
| `JWT_SECRET` | Secret key untuk JWT |
| `NEXT_MIDTRANS_SERVER_KEY` | Dari Midtrans dashboard |
| `NEXT_MIDTRANS_CLIENT_KEY` | Dari Midtrans dashboard |
| `NEXT_MIDTRANS_IS_PRODUCTION` | `false` |

## Catatan Penting

1. **Cold start:** Pages Functions akan cold start ~1-2 detik karena koneksi database via HTTP.
2. **CPU time:** Free plan 50ms CPU per request. Untuk sebagian besar CRUD operasi aman. Hindari loop besar atau komputasi berat di API routes.
3. **Image Optimization:** Tidak bisa pakai `sharp` di Workers. Gunakan custom image loader (sudah diatur di langkah 11).
4. **Excel export:** `exceljs` mungkin berat. Alternatif: pakai CSV atau export sebagai JSON.
5. **Midtrans:** Pastikan webhook Midtrans diarahkan ke URL Cloudflare Pages nanti.

## Langkah Eksekusi

1. Jalanin `npm install next@16.2.11 eslint-config-next@16.2.11 @opennextjs/cloudflare @prisma/adapter-neon @neondatabase/serverless`
2. Update `prisma/schema.prisma`
3. Jalanin `npx prisma generate`
4. Update `src/lib/db.ts`
5. Update `src/lib/auth.ts`
6. Update `src/lib/storage.ts` (ganti Buffer → Uint8Array di 3 file upload)
7. Update `src/lib/midtrans.ts` → lazy load
8. Update payment routes import midtrans
9. Update midtrans webhook route (crypto)
10. Update `next.config.ts`
11. Buat `src/lib/image-loader.ts`
12. Buat `wrangler.toml`
13. Update `package.json` scripts
14. Update `.gitignore`
15. Hapus `prisma/dev.db` dari git
16. Build: `npm run cf:build`
17. Deploy: `npm run cf:deploy` (login ke Cloudflare dulu via `npx wrangler login`)
18. Set env vars di dashboard Cloudflare Pages
19. Test!
