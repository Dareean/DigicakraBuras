# DIGICAKRA — Sistem Manajemen Fotocopy Cakrawala

Aplikasi web all-in-one untuk **Fotocopy Cakrawala** (Palu) yang mengintegrasikan pemesanan online, kasir POS, pembayaran QRIS via Midtrans, manajemen stok, program loyalitas stempel digital, dan E-Nota PDF anti-manipulasi.

---

## 📋 Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Setup Awal](#setup-awal)
- [Akun & Kredensial](#akun--kredensial)
- [Alur Pembayaran (Midtrans QRIS)](#alur-pembayaran-midtrans-qris)
- [E-Nota PDF](#e-nota-pdf)
- [Sistem Loyalitas Stempel](#sistem-loyalitas-stempel)
- [API Routes](#api-routes)
- [Keamanan](#keamanan)
- [Fitur yang Sudah Ada](#fitur-yang-sudah-ada)
- [Yang Perlu Dilanjutkan](#yang-perlu-dilanjutkan)
- [Database Schema](#database-schema)

---

## Gambaran Umum

```
Pelanggan Online          Kasir (Admin)
──────────────            ─────────────
Buka landing page    →    Login di /admin
Pilih layanan        →    Buka POS (/admin/pos)
Isi form pesanan     →    Input order manual
Dapat link checkout  →    Proses antrean
Scan QRIS Midtrans   →    Monitor dashboard
Terima konfirmasi    →    Kelola stok & pajak
Buka halaman tracking→    Klaim reward stempel
Cetak E-Nota PDF     →    Verifikasi keaslian nota
```

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma 6 |
| **Payment** | Midtrans Core API (QRIS) |
| **Auth** | Custom JWT (cookie-based) |
| **Styling** | Tailwind CSS v4 |
| **Animasi** | GSAP 3 |
| **Icons** | Lucide React |
| **PDF** | @react-pdf/renderer 4 |
| **Export Excel** | ExcelJS |
| **Runtime** | Node.js (TypeScript) |

---

## Struktur Proyek

```
src/
├── app/
│   ├── page.tsx                         # Landing page (pemesanan online)
│   ├── checkout/[orderCode]/            # Halaman pembayaran QRIS
│   ├── tracking/                        # Lacak status pesanan + stempel
│   ├── order/                           # Konfigurasi & konfirmasi pesanan
│   ├── nota/[orderCode]/                # Preview E-Nota (server-rendered)
│   │   ├── page.tsx                     # Server Component — data dari DB
│   │   ├── NotaActions.tsx              # Client Component — tombol PDF
│   │   └── PrintAutoTrigger.tsx         # Client Component — auto-print
│   │
│   ├── admin/                           # Panel Admin (dilindungi session)
│   │   ├── page.tsx                     # Dashboard (grafik pendapatan)
│   │   ├── pos/                         # Kasir POS walk-in
│   │   ├── orders/                      # Live orders & antrean
│   │   ├── products/                    # Katalog ATK
│   │   ├── inventory/                   # Stok bahan operasional
│   │   ├── customers/                   # Data pelanggan, stempel & klaim reward
│   │   ├── reports/tax/                 # Laporan pajak + export Excel
│   │   ├── settings/                    # Pengaturan pajak
│   │   └── login/                       # Login admin
│   │
│   └── api/
│       ├── orders/
│       │   ├── route.ts                 # POST — buat pesanan baru
│       │   ├── track/                   # GET — lacak by nomor WA
│       │   └── [orderCode]/
│       │       ├── route.ts             # GET — detail pesanan
│       │       ├── note/                # GET — data e-nota (JSON)
│       │       └── nota-pdf/            # GET — generate PDF binary
│       ├── products/                    # GET — katalog produk ATK
│       ├── payments/
│       │   ├── [orderId]/generate-qr/   # POST — generate QRIS Midtrans
│       │   ├── [orderId]/check-status/  # GET  — polling status pembayaran
│       │   └── webhook/midtrans/        # POST — webhook notifikasi Midtrans
│       └── admin/
│           ├── auth/                    # Login, logout, session
│           ├── dashboard/summary/       # Data grafik & kartu dashboard
│           ├── orders/[id]/status/      # PATCH — update status pesanan
│           ├── products/                # CRUD produk
│           ├── inventory/               # CRUD stok bahan
│           ├── customers/
│           │   ├── route.ts             # GET — daftar pelanggan
│           │   └── [id]/claim-reward/   # POST — klaim reward stempel
│           ├── reports/tax/             # Laporan keuangan + export Excel
│           └── settings/                # Pengaturan tarif pajak
│
├── components/
│   ├── AdminLayout.tsx                  # Layout sidebar + autentikasi admin
│   ├── Navbar.tsx                       # Navbar publik
│   └── NotaPDF.tsx                      # Template PDF @react-pdf/renderer
│
└── lib/
    ├── prisma.ts                        # Singleton Prisma client
    ├── midtrans.ts                      # Singleton Midtrans Core API client
    ├── auth.ts                          # JWT sign/verify/session
    ├── nota-integrity.ts                # HMAC-SHA256 kode integritas nota
    ├── db.ts                            # Koneksi database alternatif
    └── supabase.ts                      # Supabase client

prisma/
├── schema.prisma                        # Definisi semua model database
└── seed.ts                              # Data awal (admin, produk, stok)
```

---

## Setup Awal

### 1. Clone & Install

```bash
git clone <repo-url>
cd DigicakraBuras
npm install
```

### 2. Konfigurasi Environment

Buat file `.env` di root proyek:

```env
# ── Supabase (Database PostgreSQL) ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://rbocmtppdcvgfeudozlv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
DATABASE_URL="postgresql://postgres...6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres...5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# ── Midtrans (Payment Gateway QRIS) ───────────────────────────
NEXT_MIDTRANS_IS_PRODUCTION=false       # Ganti ke true untuk production
NEXT_MIDTRANS_SERVER_KEY="Mid-server-..."
NEXT_MIDTRANS_CLIENT_KEY="Mid-client-..."

# ── Webhook Midtrans (OPSIONAL saat development) ───────────────
# Sistem berjalan tanpa ini berkat polling aktif.
# NEXT_MIDTRANS_NOTIFICATION_URL=https://yourdomain.com/api/payments/webhook/midtrans

# ── E-Nota Security ───────────────────────────────────────────
# Kunci rahasia HMAC untuk keamanan e-nota. JANGAN di-commit ke Git.
NOTA_SECRET_KEY="ganti-dengan-string-acak-yang-panjang"
```

> **Catatan:** File `.env` tidak di-commit ke Git karena berisi credential sensitif.
> Minta file asli ke anggota tim yang sudah setup.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Seed Database (Data Awal)

> ⚠️ Perintah ini akan **menghapus semua data** yang ada dan mengisinya ulang.
> Hanya jalankan sekali saat pertama kali setup atau saat ingin reset data.

```bash
npx tsx prisma/seed.ts
```

Ini akan membuat:
- 2 akun admin (owner + staff)
- 6 produk ATK sampel
- 4 item stok operasional (kertas, tinta, dll.)
- Pengaturan pajak PPN 11% dan PPh 0.5%

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka **http://localhost:3000**

---

## Akun & Kredensial

### Admin Panel (`/admin`)

| Role | Email | Password | Akses |
|------|-------|----------|-------|
| **Owner** | owner@cakrawala.id | owner123 | Semua fitur + Pajak & Keuangan |
| **Staff** | staff@cakrawala.id | staff123 | Dashboard, POS, Orders, Produk, Stok, Pelanggan |

### Midtrans Sandbox

Untuk test pembayaran QRIS tanpa uang sungguhan:

1. Buat pesanan dari landing page → salin `orderCode`
2. Buka halaman checkout → QR Midtrans akan muncul
3. Buka **[Midtrans Sandbox Simulator](https://simulator.sandbox.midtrans.com/qris/index)**
4. Masukkan `orderCode` sebagai Order ID → klik **Bayar**
5. Tunggu ~5 detik → status otomatis berubah ke "Pembayaran Sukses"

> Polling aktif (`check-status`) akan mendeteksi settlement setiap 5 detik — **tidak perlu ngrok atau webhook** untuk development lokal.

---

## Alur Pembayaran (Midtrans QRIS)

```
1. Pelanggan buat pesanan (POST /api/orders)
        ↓
2. Redirect ke /checkout/[orderCode]
        ↓
3. Frontend call POST /api/payments/[orderId]/generate-qr
        ↓
4. Backend charge ke Midtrans Core API
   → Midtrans return URL gambar QR code
   → Simpan transaction_id ke DB (Payment.paymentGatewayRef)
        ↓
5. Frontend tampilkan gambar QR dari URL Midtrans
        ↓
6. Pelanggan scan QRIS → bayar di e-wallet/banking
        ↓
7. Polling otomatis GET /api/payments/[orderId]/check-status setiap 5 detik
   → Backend query Midtrans Get Status API
   → Jika settlement: update Order + Payment (success)
                       + deduct inventory + tambah loyalty stamp
        ↓
8. UI checkout otomatis berubah ke "Pembayaran Sukses!"
        ↓
9. Pelanggan bisa buka halaman tracking → cetak E-Nota PDF
```

### File-file Kunci Pembayaran

| File | Fungsi |
|------|--------|
| `src/lib/midtrans.ts` | Singleton Core API client |
| `src/app/api/payments/[orderId]/generate-qr/route.ts` | Charge QRIS ke Midtrans |
| `src/app/api/payments/[orderId]/check-status/route.ts` | Poll status ke Midtrans |
| `src/app/api/payments/webhook/midtrans/route.ts` | Webhook receiver (production) |
| `src/app/checkout/[orderCode]/page.tsx` | Halaman checkout dengan polling UI |

---

## E-Nota PDF

E-Nota (Elektronik Nota) adalah bukti transaksi yang dapat diunduh/dicetak oleh pelanggan setelah pembayaran sukses.

### Cara Kerja

```
Pelanggan klik "E-Nota" di halaman tracking
        ↓
Modal preview e-nota muncul (data dari API /note)
        ↓
Klik "Cetak Nota (PDF)"
        ↓
Browser membuka tab baru → GET /api/orders/[orderCode]/nota-pdf
        ↓
Server ambil data LANGSUNG dari database (tidak dari browser)
        ↓
@react-pdf/renderer generate file PDF binary di server
        ↓
Browser tampilkan PDF siap cetak
```

### Keamanan E-Nota

| Ancaman | Solusi |
|---------|--------|
| Manipulasi angka via browser DevTools | PDF di-generate **server-side** — data dari DB, bukan DOM |
| Akses e-nota pesanan belum bayar | Guard `isPaid === true`, return `403` jika belum lunas |
| Pemalsuan nota cetak | HMAC-SHA256 dari `orderCode + totalAmount` di `src/lib/nota-integrity.ts` |

> **Penting:** `NOTA_SECRET_KEY` di `.env` wajib diisi dengan string acak yang kuat.
> Jangan gunakan nilai default untuk production.

### File-file E-Nota

| File | Fungsi |
|------|--------|
| `src/components/NotaPDF.tsx` | Template PDF (layout struk thermal 90mm) |
| `src/app/api/orders/[orderCode]/nota-pdf/route.ts` | API generate PDF binary dari DB |
| `src/app/api/orders/[orderCode]/note/route.ts` | API data nota (JSON, untuk preview modal) |
| `src/app/nota/[orderCode]/page.tsx` | Halaman preview nota (server-rendered) |
| `src/lib/nota-integrity.ts` | HMAC-SHA256 helper |

---

## Sistem Loyalitas Stempel

Setiap pelanggan yang melakukan pembayaran lunas mendapat **1 stempel digital**.

### Aturan

- **10 stempel** = 1 reward (hadiah/diskon di kasir)
- Stempel dihitung otomatis saat pembayaran sukses
- Reward diklaim manual oleh admin melalui panel `/admin/customers`
- Pelanggan dapat melihat stempel mereka di halaman `/tracking`

### Alur Klaim Reward

```
Pelanggan tunjukkan halaman tracking ke kasir
        ↓
Admin buka /admin/customers → cari pelanggan
        ↓
Klik tombol "Klaim Reward" (muncul jika ada reward belum diklaim)
        ↓
POST /api/admin/customers/[id]/claim-reward
        ↓
Satu record Stamp di-update: redeemed = true
        ↓
Counter reward pelanggan diperbarui
```

---

## API Routes

### Publik

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/orders/[orderCode]` | Detail pesanan by kode |
| `GET` | `/api/orders/[orderCode]/note` | Data e-nota (JSON, hanya jika lunas) |
| `GET` | `/api/orders/[orderCode]/nota-pdf` | Generate & unduh E-Nota PDF |
| `GET` | `/api/orders/track?whatsapp=...` | Lacak pesanan by nomor WA |
| `POST` | `/api/orders` | Buat pesanan baru |
| `POST` | `/api/payments/[orderId]/generate-qr` | Generate QRIS Midtrans |
| `GET` | `/api/payments/[orderId]/check-status` | Cek & sinkronisasi status pembayaran |
| `POST` | `/api/payments/webhook/midtrans` | Notifikasi push dari Midtrans |
| `GET` | `/api/products` | Daftar produk ATK aktif |

### Admin (perlu session cookie `admin_session`)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `POST` | `/api/admin/auth/login` | Login admin |
| `POST` | `/api/admin/auth/logout` | Logout |
| `GET` | `/api/admin/auth/session` | Cek session aktif |
| `GET` | `/api/admin/dashboard/summary` | Data dashboard (grafik, kartu) |
| `GET/POST` | `/api/admin/orders` | Manajemen pesanan |
| `PATCH` | `/api/admin/orders/[id]/status` | Update status pesanan |
| `GET/POST/PATCH/DELETE` | `/api/admin/products/[id]` | CRUD produk ATK |
| `GET/POST` | `/api/admin/inventory` | Manajemen stok bahan |
| `GET` | `/api/admin/customers` | Data pelanggan & stempel |
| `POST` | `/api/admin/customers/[id]/claim-reward` | Klaim reward stempel pelanggan |
| `GET` | `/api/admin/reports/tax` | Laporan keuangan |
| `GET` | `/api/admin/reports/tax/export` | Export laporan ke Excel |
| `GET/POST` | `/api/admin/settings` | Pengaturan pajak |

---

## Keamanan

### Autentikasi Admin
- JWT disimpan di HttpOnly cookie (`admin_session`)
- Setiap route `/api/admin/*` memvalidasi session
- Role `owner` mendapat akses ke halaman pajak/keuangan; `staff` tidak

### E-Nota Anti-Manipulasi
- PDF di-generate **server-side** menggunakan `@react-pdf/renderer`
- Data selalu diambil langsung dari database — bukan dari DOM browser
- Hanya pesanan berstatus **lunas** (`payment.status === "success"`) yang bisa generate e-nota
- `NOTA_SECRET_KEY` di `.env` digunakan untuk signing HMAC (tidak di-expose ke client)

### Input Validation
- Semua harga & subtotal dihitung ulang di server saat order dibuat
- Client tidak bisa mengirim harga yang sudah dimanipulasi

---

## Fitur yang Sudah Ada

- ✅ **Landing page** — form pemesanan online (print, fotokopi, ATK) dengan GSAP scroll
- ✅ **Checkout QRIS** — QR dari Midtrans, polling otomatis setiap 5 detik, animasi GSAP
- ✅ **Tracking pesanan** — cek status by nomor WhatsApp, timeline stepper, stempel digital
- ✅ **E-Nota PDF** — generate PDF binary server-side via `@react-pdf/renderer`, anti-manipulasi
- ✅ **Admin Dashboard** — grafik pendapatan mingguan, kartu summary (omset, transaksi, dll.)
- ✅ **POS Kasir** — input pesanan walk-in, bayar tunai/QRIS, langsung selesai
- ✅ **Live Orders** — antrean real-time, update status (diterima → diproses → siap → selesai)
- ✅ **Katalog ATK** — CRUD produk dengan stok, gambar, harga
- ✅ **Manajemen Stok** — bahan operasional (kertas, tinta, dll.) + log perubahan otomatis
- ✅ **Loyalitas Stempel** — 1 stempel per pesanan lunas, reward tiap 10 stempel
- ✅ **Klaim Reward** — admin klaim reward pelanggan via panel customers
- ✅ **Pajak & Laporan** — PPN/PPh, laporan per periode, export Excel (owner only)
- ✅ **RBAC** — owner vs staff, menu dan akses berbeda
- ✅ **Upload dokumen print** — Supabase Storage untuk file PDF pelanggan

## Database Schema

Model utama di `prisma/schema.prisma`:

```
Customer      — data pelanggan (nama, WA, totalStamps)
Order         — pesanan (online/POS, status, total, sumber)
OrderItem     — detail item per pesanan (print/ATK, qty, harga)
OrderAddon    — add-on item (jilid, laminating, dll.)
Payment       — pembayaran (QRIS Midtrans/cash, status, gateway ref)
Product       — katalog ATK yang dijual (nama, harga, stok)
InventoryItem — stok bahan operasional (kertas, tinta, dll.)
InventoryLog  — log setiap perubahan stok
Stamp         — catatan stempel loyalitas per pesanan (redeemed flag)
Admin         — akun admin (owner/staff, hashed password)
TaxSettings   — pengaturan tarif pajak (PPN, PPh)
TaxReport     — laporan pajak yang di-generate per periode
```

---

*Proyek ini dibuat untuk keperluan tugas kelompok — Fotocopy Cakrawala, Donggala.*
