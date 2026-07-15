# DIGICAKRA — Sistem Manajemen Fotocopy Cakrawala

Aplikasi web all-in-one untuk **Fotocopy Cakrawala** (Palu) yang mengintegrasikan pemesanan online, kasir POS, pembayaran QRIS via Midtrans, manajemen stok, dan program loyalitas stempel digital.

---

## 📋 Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Setup Awal](#setup-awal)
- [Akun & Kredensial](#akun--kredensial)
- [Alur Pembayaran (Midtrans QRIS)](#alur-pembayaran-midtrans-qris)
- [API Routes](#api-routes)
- [Fitur yang Sudah Ada](#fitur-yang-sudah-ada)
- [Yang Perlu Dilanjutkan](#yang-perlu-dilanjutkan)

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
```

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma 6 |
| **Payment** | Midtrans Core API (QRIS) |
| **Auth** | Custom JWT (cookie-based) |
| **Styling** | Tailwind CSS v4 |
| **Animasi** | GSAP 3 |
| **Icons** | Lucide React |
| **Runtime** | Node.js (TypeScript) |

---

## Struktur Proyek

```
src/
├── app/
│   ├── page.tsx                    # Landing page (pemesanan online)
│   ├── checkout/[orderCode]/       # Halaman pembayaran QRIS
│   ├── tracking/                   # Lacak status pesanan
│   ├── order/                      # Konfirmasi pesanan
│   │
│   ├── admin/                      # Panel Admin (dilindungi session)
│   │   ├── page.tsx                # Dashboard (grafik pendapatan)
│   │   ├── pos/                    # Kasir POS walk-in
│   │   ├── orders/                 # Live orders & antrean
│   │   ├── products/               # Katalog ATK
│   │   ├── inventory/              # Stok bahan operasional
│   │   ├── customers/              # Data pelanggan & stempel
│   │   ├── tax/                    # Pajak & laporan keuangan (owner only)
│   │   └── login/                  # Login admin
│   │
│   └── api/
│       ├── orders/                 # CRUD pesanan
│       ├── products/               # CRUD produk ATK
│       ├── payments/
│       │   ├── [orderId]/generate-qr/   # Generate QRIS Midtrans
│       │   ├── [orderId]/check-status/  # Polling status pembayaran
│       │   └── webhook/midtrans/        # Webhook notifikasi Midtrans
│       └── admin/
│           ├── auth/               # Login, logout, session
│           ├── dashboard/summary/  # Data grafik & kartu dashboard
│           ├── orders/             # Manajemen pesanan oleh admin
│           ├── products/           # CRUD produk
│           ├── inventory/          # CRUD stok bahan
│           ├── customers/          # Data pelanggan
│           ├── reports/            # Laporan keuangan
│           └── settings/           # Pengaturan pajak
│
├── components/
│   ├── AdminLayout.tsx             # Layout sidebar + autentikasi admin
│   └── Navbar.tsx                  # Navbar publik
│
└── lib/
    ├── prisma.ts                   # Singleton Prisma client
    ├── midtrans.ts                 # Singleton Midtrans Core API client
    ├── auth.ts                     # JWT sign/verify/session
    ├── db.ts                       # Koneksi database alternatif
    └── supabase.ts                 # Supabase client

prisma/
├── schema.prisma                   # Definisi semua model database
└── seed.ts                         # Data awal (admin, produk, stok)
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

Buat file `.env` di root proyek (atau minta file dari anggota tim):

```env
# ── Supabase (Database PostgreSQL) ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://rbocmtppdcvgfeudozlv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
DATABASE_URL="postgresql://postgres...6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres...5432/postgres"

# ── Midtrans (Payment Gateway QRIS) ───────────────────────────
NEXT_MIDTRANS_IS_PRODUCTION=false       # Ganti ke true untuk production
NEXT_MIDTRANS_SERVER_KEY="Mid-server-..."
NEXT_MIDTRANS_CLIENT_KEY="Mid-client-..."

# ── Webhook Midtrans (OPSIONAL saat development) ───────────────
# Sistem berjalan tanpa ini berkat polling aktif.
# Untuk production, daftarkan di Midtrans Dashboard → Settings → Configuration
# NEXT_MIDTRANS_NOTIFICATION_URL=https://yourdomain.com/api/payments/webhook/midtrans
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
   → Jika settlement: update Order (diterima) + Payment (success)
                       + deduct inventory + tambah loyalty stamp + buat e-nota
        ↓
8. UI checkout otomatis berubah ke "Pembayaran Sukses!"
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

## API Routes

### Publik

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/orders/[orderCode]` | Detail pesanan by kode |
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
| `GET` | `/api/admin/reports` | Laporan keuangan |
| `GET/POST` | `/api/admin/settings` | Pengaturan pajak |

---

## Fitur yang Sudah Ada

- ✅ **Landing page** — form pemesanan online (print, fotokopi, ATK)
- ✅ **Checkout QRIS** — QR dari Midtrans, polling otomatis, animasi GSAP
- ✅ **Tracking pesanan** — cek status by nomor WhatsApp
- ✅ **Admin Dashboard** — grafik pendapatan mingguan, kartu summary
- ✅ **POS Kasir** — input pesanan walk-in, bayar tunai/QRIS
- ✅ **Live Orders** — antrean real-time, update status (diterima → diproses → siap → selesai)
- ✅ **Katalog ATK** — CRUD produk dengan stok
- ✅ **Manajemen Stok** — bahan operasional (kertas, tinta, dll.) + log perubahan
- ✅ **Loyalitas Stempel** — 1 stempel per pesanan lunas per pelanggan WA
- ✅ **Pajak & Laporan** — PPN/PPh, laporan per periode (owner only)
- ✅ **RBAC** — owner vs staff, menu berbeda

---

## Yang Perlu Dilanjutkan

> Bagian ini untuk anggota tim yang melanjutkan pengembangan.

### 🔴 Prioritas Tinggi

- [ ] **Upload file** — integrasi Supabase Storage untuk upload dokumen print pelanggan
- [ ] **E-Nota PDF** — generate PDF nota elektronik (endpoint `/api/orders/[id]/note` sudah ada tapi belum diimplementasi)
- [ ] **Notif WhatsApp** — kirim konfirmasi pesanan & QR ke nomor WA pelanggan (pertimbangkan Fonnte atau Whatsapp Cloud API)

### 🟡 Prioritas Menengah

- [ ] **Midtrans Production** — ganti `NEXT_MIDTRANS_IS_PRODUCTION=true` dan daftarkan webhook URL di dashboard Midtrans saat go-live
- [ ] **Halaman pas foto & undangan** — form khusus untuk layanan tersebut (itemType sudah ada di schema)
- [ ] **Export laporan** — download CSV/Excel dari halaman pajak
- [ ] **Notifikasi stok menipis** — alert email/WA ke owner saat stok di bawah threshold

### 🟢 Nice to Have

- [ ] **PWA / installable** — agar kasir bisa pakai seperti aplikasi native
- [ ] **Dark mode** admin panel
- [ ] **Multi-cabang** — saat toko berkembang

---

## Database Schema

Model utama di `prisma/schema.prisma`:

```
Customer     — data pelanggan (WA, stempel)
Order        — pesanan (online/POS, status, total)
OrderItem    — detail item per pesanan
OrderAddon   — add-on (jilid, laminating)
Payment      — pembayaran (QRIS Midtrans, cash)
Product      — katalog ATK dijual
InventoryItem — stok bahan operasional
InventoryLog  — log perubahan stok
Stamp        — catatan stempel loyalitas
Note         — e-nota per pesanan
Admin        — akun admin (owner/staff)
TaxSettings  — pengaturan tarif pajak
TaxReport    — laporan pajak per periode
```

---

## Kontributor

| Nama | Role |
|------|------|
| *(nama anggota tim)* | *(role)* |

---

*Proyek ini dibuat untuk keperluan tugas kelompok — Fotocopy Cakrawala, Palu.*
