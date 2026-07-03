# Product Requirements Document (PRD)
# DIGICAKRA — One-Stop QRIS Solution untuk UMKM Fotocopy Cakrawala

**Versi Dokumen:** 1.0
**Tanggal:** 2 Juli 2026
**Disusun oleh:** Dareean Ahmad Raffi Mardin, Claudya Christy Koloay, Muhammad Naufal Amar
**Institusi:** Universitas Tadulako — untuk Lomba Inovasi Daerah Masyarakat Berbasis Digitalisasi Pembayaran, BRIDA Provinsi Sulawesi Tengah 2026
**Status:** Draft untuk Pengembangan

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Masalah](#2-latar-belakang--masalah)
3. [Tujuan Produk & Metrik Keberhasilan](#3-tujuan-produk--metrik-keberhasilan)
4. [Target Pengguna & Persona](#4-target-pengguna--persona)
5. [Ruang Lingkup (Scope)](#5-ruang-lingkup-scope)
6. [User Stories](#6-user-stories)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Arsitektur Sistem](#9-arsitektur-sistem)
10. [Skema Database](#10-skema-database)
11. [Spesifikasi API](#11-spesifikasi-api)
12. [Alur Pengguna (User Flow)](#12-alur-pengguna-user-flow)
13. [Referensi UI/UX](#13-referensi-uiux)
14. [Role & Hak Akses (RBAC)](#14-role--hak-akses-rbac)
15. [Roadmap & Milestone](#15-roadmap--milestone)
16. [Risiko & Asumsi](#16-risiko--asumsi)
17. [Lampiran](#17-lampiran)

---

## 1. Ringkasan Eksekutif

DIGICAKRA (Digital Cakrawala) adalah platform digital terintegrasi berbasis QRIS yang dirancang untuk UMKM Fotocopy Cakrawala. Sistem ini menyatukan pemesanan layanan cetak/fotokopi, pembelian ATK, pembayaran QRIS, pencatatan transaksi, monitoring stok, e-nota, program loyalitas (stempel digital), dan rekapitulasi administrasi pajak sederhana dalam satu ekosistem.

Produk terdiri dari dua permukaan utama:
- **Customer-facing web app** (tanpa perlu login/akun) — untuk memesan layanan dan ATK, membayar via QRIS, serta melacak status pesanan menggunakan nomor telepon.
- **Admin dashboard** (memerlukan login aman) — untuk pemilik usaha memantau pesanan real-time, mengelola stok, melihat laporan keuangan, dan mengekspor rekap pajak.

**Tech Stack:** Next.js (React) untuk frontend, Laravel (PHP) untuk backend/API, MySQL sebagai database utama, dan integrasi payment gateway QRIS pihak ketiga (mis. Midtrans/Xendit) untuk pemrosesan pembayaran sesuai standar Bank Indonesia.

---

## 2. Latar Belakang & Masalah

Berdasarkan observasi pada UMKM Fotocopy Cakrawala (rujukan: Proposal Lomba Inovasi Daerah BRIDA 2026), ditemukan masalah berikut:

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | QRIS belum terintegrasi dengan sistem administrasi | Data pembayaran tidak otomatis tercatat |
| 2 | Pencatatan transaksi manual | Rawan human error |
| 3 | Rekapitulasi pajak manual, tidak terhubung data transaksi | Proses lambat, rawan salah hitung |
| 4 | Pelanggan wajib datang langsung menyerahkan dokumen | Tidak efisien, antre lama |
| 5 | Nota transaksi berbasis kertas | Sulit diarsipkan, boros |
| 6 | Monitoring stok manual | Pemilik tidak tahu stok real-time |
| 7 | Pengelolaan ATK manual | Sulit mengetahui ketersediaan barang akurat |

---

## 3. Tujuan Produk & Metrik Keberhasilan

### 3.1 Tujuan
1. Mengintegrasikan pemesanan, pembayaran QRIS, dan administrasi dalam satu sistem.
2. Menghilangkan kebutuhan pelanggan datang langsung hanya untuk menyerahkan dokumen.
3. Mengotomatiskan pencatatan transaksi, stok, dan rekap pajak sederhana.
4. Menyediakan e-nota digital dan program loyalitas pelanggan (stempel digital).
5. Menyediakan dashboard monitoring bagi pemilik usaha.

### 3.2 Indikator Keberhasilan (KPI)

| Metrik | Target (3 bulan pasca-peluncuran) |
|---|---|
| % transaksi via DIGICAKRA vs QR statis lama | ≥ 80% |
| Waktu rata-rata proses pesanan (submit → siap ambil) | Berkurang ≥ 30% dibanding proses manual |
| Kesalahan pencatatan transaksi/stok | Mendekati 0% |
| Waktu penyusunan rekap pajak bulanan | Berkurang ≥ 70% (dari manual ke otomatis) |
| Retensi pelanggan (repeat order via poin stempel) | ≥ 25% pelanggan melakukan transaksi ulang |
| Uptime sistem admin | ≥ 99% |

---

## 4. Target Pengguna & Persona

### Persona 1 — Pelanggan (Rina, 24 tahun, mahasiswa)
Butuh print skripsi cepat tanpa antre, tidak mau ribet daftar akun, ingin tahu status pesanan tanpa harus datang berulang kali.

### Persona 2 — Pemilik Usaha (Bu Herlina, pemilik Fotocopy Cakrawala)
Butuh melihat omzet harian/bulanan secara instan, mengetahui stok kertas/tinta menipis sebelum kehabisan, dan menyusun rekap pajak tanpa hitung manual.

### Persona 3 — Admin Operasional (karyawan toko)
Mengelola pesanan masuk, memperbarui status pengerjaan, dan mengelola input stok harian.

---

## 5. Ruang Lingkup (Scope)

### 5.1 In-Scope (MVP)
- Pemesanan jasa cetak (print dokumen, fotokopi, cetak pas foto, cetak undangan)
- Pemesanan ATK
- Pembayaran QRIS terintegrasi dengan verifikasi otomatis
- Tracking status pesanan via nomor telepon (tanpa akun)
- Dashboard admin: live orders, financial report, inventory monitoring, customer list
- E-nota digital (unduh/kirim)
- Program stempel digital / poin loyalitas
- Rekap pajak sederhana (ekspor PDF/Excel) — murni alat bantu internal, bukan pelaporan resmi ke negara
- Autentikasi admin (login aman)

### 5.2 Out-of-Scope (MVP)
- Pelaporan pajak resmi ke DJP / integrasi e-Faktur
- Aplikasi mobile native (iOS/Android) — versi awal berbasis web responsif
- Multi-cabang / multi-tenant (sistem dirancang untuk satu lokasi usaha)
- Sistem pengiriman/kurir (pengambilan hanya di lokasi)
- Chat/live support pelanggan real-time

### 5.3 Future Scope (Post-MVP)
- Aplikasi mobile untuk admin
- Notifikasi WhatsApp otomatis (status pesanan)
- Multi-cabang
- Integrasi akuntansi pihak ketiga

---

## 6. User Stories

### Sebagai Pelanggan
- Sebagai pelanggan, saya ingin memesan layanan print tanpa membuat akun, agar prosesnya cepat.
- Sebagai pelanggan, saya ingin mengunggah dokumen langsung dari HP, agar tidak perlu membawa flashdisk.
- Sebagai pelanggan, saya ingin membayar via QRIS dan melihat konfirmasi otomatis, agar tidak perlu menunjukkan bukti transfer manual.
- Sebagai pelanggan, saya ingin melacak status pesanan saya menggunakan nomor telepon, agar tahu kapan harus mengambil.
- Sebagai pelanggan, saya ingin menerima e-nota digital, agar punya bukti transaksi tanpa kertas.
- Sebagai pelanggan setia, saya ingin mengumpulkan stempel digital, agar mendapat potongan harga.

### Sebagai Pemilik Usaha / Admin
- Sebagai pemilik usaha, saya ingin login ke dashboard admin secara aman, agar data usaha saya terlindungi.
- Sebagai pemilik usaha, saya ingin melihat pesanan masuk secara real-time, agar bisa segera memprosesnya.
- Sebagai pemilik usaha, saya ingin stok otomatis berkurang saat transaksi sukses, agar saya tahu kapan harus restock.
- Sebagai pemilik usaha, saya ingin melihat laporan pendapatan harian/bulanan, agar bisa mengambil keputusan bisnis.
- Sebagai pemilik usaha, saya ingin mengekspor rekap pajak sederhana dalam PDF/Excel, agar mempermudah pembukuan.
- Sebagai admin operasional, saya ingin mengubah status pesanan (menunggu pembayaran → diproses → selesai → siap diambil), agar pelanggan mendapat info akurat.

---

## 7. Functional Requirements

### 7.1 Fitur Utama (Prioritas P0 — Wajib MVP)

| ID | Fitur | Deskripsi |
|---|---|---|
| FR-01 | Pemesanan Jasa Online | Pelanggan memilih layanan cetak, mengunggah dokumen, mengisi spesifikasi (jumlah, warna, ukuran, jilid), input nomor telepon |
| FR-02 | Pemesanan ATK | Pelanggan melihat katalog ATK dengan stok real-time, menambah ke keranjang, checkout |
| FR-03 | Pembayaran QRIS Terintegrasi | Generate QR dinamis per transaksi, callback/webhook otomatis dari payment gateway untuk update status |
| FR-04 | Login Admin | Autentikasi aman (email/username + password, hashed, session/token-based) |

### 7.2 Fitur Pemantauan & Administrasi (Prioritas P1)

| ID | Fitur | Deskripsi |
|---|---|---|
| FR-05 | Tracking Pesanan Pelanggan | Halaman publik: input no. telepon → tampilkan daftar pesanan & status |
| FR-06 | Dashboard Monitoring Stok | Tampilan stok kertas/tinta/ATK, auto-decrement saat transaksi sukses, alert stok menipis |
| FR-07 | Rekap Administrasi Pajak Sederhana | Agregasi pendapatan harian/bulanan/tahunan, ekspor PDF/Excel. Disclaimer: bukan pelaporan pajak resmi |
| FR-08 | Live Orders Dashboard | Daftar pesanan real-time dengan filter status, pencarian by nama/no. telepon |
| FR-09 | Laporan Keuangan | Grafik pendapatan, ringkasan omzet per periode |
| FR-10 | Manajemen Pelanggan | Daftar pelanggan, riwayat transaksi, jumlah poin/stempel |

### 7.3 Fitur Pendukung (Prioritas P2)

| ID | Fitur | Deskripsi |
|---|---|---|
| FR-11 | Program Stempel Digital | Auto-record stempel per transaksi berdasarkan no. telepon, redeem promo saat threshold tercapai |
| FR-12 | E-Nota Digital | Generate nota PDF otomatis pasca-pembayaran sukses, dapat diunduh/dikirim |
| FR-13 | Backup Otomatis | Pencadangan database berkala (harian) |

---

## 8. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Keamanan** | Password admin di-hash (bcrypt/argon2); autentikasi berbasis token (Laravel Sanctum); data pelanggan (no. telepon) disimpan terenkripsi at-rest; HTTPS wajib di seluruh endpoint; rate limiting pada endpoint publik untuk mencegah abuse; validasi & verifikasi pembayaran QRIS dilakukan server-side melalui webhook resmi payment gateway, bukan client-side |
| **Kehandalan** | Uptime admin dashboard ≥ 99%; transaksi & stok diproses dalam satu database transaction (atomic) agar tidak terjadi race condition; sistem tetap dapat diakses pelanggan meski koneksi lambat (optimasi asset & lazy loading) |
| **Kemudahan Pengguna** | Alur pemesanan pelanggan maksimal 4 langkah tanpa registrasi; desain mobile-first & responsif; dashboard admin dengan visual grafik sederhana |
| **Skalabilitas** | Arsitektur backend modular (Laravel service layer) agar mudah menambah cabang/fitur di masa depan |
| **Kepatuhan** | Pembayaran mengikuti standar QRIS Bank Indonesia via payment gateway berlisensi; fitur pajak eksplisit dinyatakan sebagai alat bantu internal, bukan pelaporan resmi ke negara |
| **Performa** | Waktu load halaman pemesanan < 2 detik pada koneksi 4G; update status dashboard admin real-time (polling/websocket, maks delay 5 detik) |

---

## 9. Arsitektur Sistem

### 9.1 Overview

```
┌─────────────────────┐        ┌──────────────────────┐
│   Customer Web App   │        │    Admin Dashboard    │
│   (Next.js, public)  │        │   (Next.js, secured)  │
└──────────┬───────────┘        └───────────┬──────────┘
           │  REST API (HTTPS)               │  REST API (HTTPS, Auth Token)
           └───────────────┬─────────────────┘
                            ▼
                 ┌─────────────────────┐
                 │   Laravel Backend    │
                 │  (API + Services)    │
                 │  - Order Service     │
                 │  - Payment Service   │
                 │  - Inventory Service │
                 │  - Report Service    │
                 │  - Loyalty Service   │
                 └──────────┬───────────┘
                            │
          ┌─────────────────┼───────────────────┐
          ▼                 ▼                    ▼
   ┌─────────────┐  ┌──────────────┐   ┌──────────────────┐
   │   MySQL DB   │  │  File Storage │   │  QRIS Payment     │
   │ (transaksi,  │  │  (dokumen     │   │  Gateway (mis.    │
   │  stok, dll)  │  │  upload, nota)│   │  Midtrans/Xendit) │
   └─────────────┘  └──────────────┘   └──────────────────┘
                                                  │
                                          Webhook callback
                                          status pembayaran
```

### 9.2 Komponen Utama
- **Frontend (Next.js/React + Tailwind CSS):** landing page, form pemesanan, halaman pembayaran, halaman tracking, dashboard admin.
- **Backend (Laravel, REST API):** autentikasi, order management, integrasi payment gateway, inventory service, reporting service, loyalty/stempel service.
- **Database (MySQL):** menyimpan seluruh data transaksional dan master data.
- **File Storage:** menyimpan dokumen upload pelanggan (dapat menggunakan local storage/S3-compatible object storage) dan file e-nota PDF.
- **Payment Gateway pihak ketiga:** menghasilkan QR dinamis, memvalidasi pembayaran, mengirim webhook ke backend saat status berubah.

### 9.3 Alasan Pilihan Stack
Next.js dipilih karena performa rendering cepat (SSR/SSG) untuk landing page publik dan pengalaman SPA untuk dashboard admin. Laravel dipilih karena ekosistem matang untuk REST API, autentikasi (Sanctum), queue job (untuk generate e-nota/backup), dan kemudahan integrasi payment gateway Indonesia.

---

## 10. Skema Database

### 10.1 Entity Relationship (ringkas)

```
customers ──< orders ──< order_items >── products
                │
                ├──< payments
                ├──< notes (e-nota)
                └──< stamps (loyalty)

admins (terpisah dari customers)
inventory_items ──< inventory_logs
```

### 10.2 Tabel Utama

**customers**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| phone_number | VARCHAR(20) UNIQUE | identitas utama pelanggan |
| name | VARCHAR(100) | opsional, diisi saat order |
| total_stamps | INT DEFAULT 0 | akumulasi stempel |
| created_at / updated_at | TIMESTAMP | |

**orders**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_code | VARCHAR(20) UNIQUE | mis. #ORD-092 |
| customer_id | BIGINT FK → customers | |
| order_type | ENUM('print','atk','mixed') | |
| status | ENUM('menunggu_pembayaran','diproses','selesai','siap_diambil','dibatalkan') | |
| total_amount | DECIMAL(12,2) | |
| pickup_note | TEXT | catatan pesanan |
| created_at / updated_at | TIMESTAMP | |

**order_items**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT FK → orders | |
| item_type | ENUM('print_doc','fotokopi','pas_foto','undangan','atk') | |
| product_id | BIGINT FK → products (nullable, untuk ATK) | |
| file_url | VARCHAR(255) | dokumen upload (nullable, untuk ATK) |
| spec_json | JSON | detail spesifikasi (halaman, warna, ukuran, jilid) |
| qty | INT | |
| unit_price | DECIMAL(12,2) | |
| subtotal | DECIMAL(12,2) | |

**products** (katalog ATK)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(100) | |
| price | DECIMAL(12,2) | |
| stock_qty | INT | |
| category | VARCHAR(50) | |
| is_active | BOOLEAN | |

**payments**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT FK → orders | |
| payment_gateway_ref | VARCHAR(100) | ID transaksi dari gateway QRIS |
| qr_string | TEXT | payload QRIS |
| amount | DECIMAL(12,2) | |
| status | ENUM('pending','success','failed','expired') | |
| paid_at | TIMESTAMP NULLABLE | |
| webhook_payload | JSON | raw data callback untuk audit |

**inventory_items** (kertas, tinta, dll — bahan operasional, terpisah dari produk ATK jual)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| item_name | VARCHAR(100) | |
| unit | VARCHAR(20) | rim, botol, pack |
| current_qty | INT | |
| min_threshold | INT | untuk alert stok menipis |

**inventory_logs**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| inventory_item_id | BIGINT FK | |
| change_qty | INT | bisa negatif (pemakaian) atau positif (restock) |
| reason | VARCHAR(100) | mis. "transaksi #ORD-092" |
| created_at | TIMESTAMP | |

**notes** (e-nota)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT FK → orders | |
| pdf_url | VARCHAR(255) | |
| sent_at | TIMESTAMP NULLABLE | |

**stamps**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| customer_id | BIGINT FK | |
| order_id | BIGINT FK | sumber stempel |
| stamp_count | INT DEFAULT 1 | |
| redeemed | BOOLEAN DEFAULT false | |

**admins**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(100) UNIQUE | |
| password_hash | VARCHAR(255) | |
| role | ENUM('owner','staff') | lihat bagian RBAC |
| created_at / updated_at | TIMESTAMP | |

**tax_reports** (cache hasil rekap, opsional — bisa juga dihitung on-the-fly)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| period_type | ENUM('harian','bulanan','tahunan') | |
| period_value | VARCHAR(20) | mis. "2026-07" |
| total_revenue | DECIMAL(14,2) | |
| generated_at | TIMESTAMP | |
| file_url | VARCHAR(255) | export PDF/Excel |

---

## 11. Spesifikasi API

Base URL: `https://api.digicakra.id/v1`

### 11.1 Public Endpoints (Pelanggan)

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/products` | Daftar ATK aktif beserta stok |
| POST | `/orders` | Membuat pesanan baru (print/ATK), body: phone_number, items[], notes |
| GET | `/orders/track?phone={no}` | Mengambil daftar pesanan berdasarkan no. telepon |
| GET | `/orders/{order_code}` | Detail satu pesanan |
| POST | `/payments/{order_id}/generate-qr` | Generate QRIS dinamis untuk pesanan |
| POST | `/payments/webhook` | Endpoint callback dari payment gateway (server-to-server, signature-verified) |
| GET | `/orders/{order_id}/note` | Unduh e-nota PDF |

### 11.2 Admin Endpoints (Perlu Auth Token)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/admin/login` | Login, return token |
| POST | `/admin/logout` | Logout / invalidate token |
| GET | `/admin/orders` | List live orders, filter by status/tanggal |
| PATCH | `/admin/orders/{id}/status` | Update status pesanan |
| GET | `/admin/inventory` | List item inventori + status stok |
| PATCH | `/admin/inventory/{id}` | Update stok (restock manual) |
| GET | `/admin/reports/revenue?period=` | Laporan pendapatan (harian/bulanan/tahunan) |
| GET | `/admin/reports/tax/export?period=&format=pdf|xlsx` | Ekspor rekap pajak sederhana |
| GET | `/admin/customers` | List pelanggan + riwayat & poin |
| GET | `/admin/dashboard/summary` | Ringkasan: pendapatan hari ini, bulan ini, pesanan aktif |

### 11.3 Format Response (contoh)

```json
// POST /orders — response
{
  "order_code": "ORD-093",
  "status": "menunggu_pembayaran",
  "total_amount": 26000,
  "qr_payment_url": "/payments/93/generate-qr"
}
```

---

## 12. Alur Pengguna (User Flow)

### 12.1 Alur Pelanggan — Pemesanan Print Dokumen
1. Pelanggan membuka landing page → klik "Print Dokumen"
2. Upload file, isi spesifikasi (jumlah halaman, warna, ukuran, jilid)
3. Masukkan nomor telepon
4. Sistem menampilkan ringkasan pesanan & total harga
5. Sistem generate QRIS dinamis
6. Pelanggan scan & bayar via e-wallet/mobile banking apa pun
7. Payment gateway mengirim webhook → backend update status pembayaran → status order otomatis menjadi "diproses"
8. Stok bahan (jika relevan) berkurang otomatis, e-nota digenerate
9. Pelanggan dapat cek status via halaman tracking (input no. telepon)
10. Admin update status menjadi "siap diambil" saat selesai dicetak
11. Pelanggan datang ambil dokumen, stempel loyalitas otomatis bertambah

### 12.2 Alur Admin — Monitoring Harian
1. Admin login ke dashboard
2. Melihat ringkasan: pendapatan hari ini, pesanan aktif, stok menipis
3. Membuka "Live Orders" → memproses pesanan sesuai antrean
4. Update status per pesanan
5. Mengecek "Monitoring Stok" → restock jika ada alert
6. Di akhir bulan, membuka "Rekap Pajak" → ekspor PDF/Excel

### 12.3 Alur Pembayaran (Detail Teknis)
```
Pelanggan checkout → Backend create order (status: menunggu_pembayaran)
   → Backend call Payment Gateway API (generate QR)
   → Gateway return qr_string → ditampilkan ke pelanggan
   → Pelanggan bayar via aplikasi bank/e-wallet
   → Gateway kirim webhook ke /payments/webhook (signed)
   → Backend verifikasi signature → update payments.status = success
   → Backend trigger: update orders.status, kurangi stok, generate e-nota, tambah stempel
```

---

## 13. Referensi UI/UX

Berdasarkan mockup pada proposal, terdapat 3 layar utama yang menjadi acuan desain:

1. **Landing Page** — Header dengan navigasi (Layanan, Promo, Cara Kerja, Tracking Pesanan), hero section dengan CTA "Pesan Sekarang", grid 4 kategori layanan (Fotocopy, Print Dokumen, Cetak Pas Foto, Cetak Undangan).
2. **Halaman Pembayaran** — Ringkasan pesanan di kiri (detail file, spesifikasi, lokasi pengambilan, catatan), rincian pembayaran & QR code di kanan, status pembayaran real-time, tombol konfirmasi "Saya Sudah Bayar" (sebagai fallback UX sambil menunggu webhook).
3. **Dashboard Admin** — Sidebar navigasi (Dashboard, Live Orders, Financials, Inventory, Customers, Administration), kartu ringkasan (pendapatan hari ini/bulan ini, pesanan aktif), tabel live orders dengan status berwarna, panel monitoring stok dengan indikator warna (Aman/Menipis/Habis).

Gaya visual: bersih, minimalis, warna aksen merah (brand DIGICAKRA), tipografi sans-serif, kartu dengan sudut membulat dan bayangan tipis — konsisten dengan preferensi desain minimalis dan sophisticated.

---

## 14. Role & Hak Akses (RBAC)

| Role | Akses |
|---|---|
| **Pelanggan (guest)** | Membuat pesanan, melihat tracking pesanan sendiri (via no. telepon), mengunduh e-nota sendiri. Tidak ada login. |
| **Owner (Pemilik Usaha)** | Akses penuh: live orders, financial report, inventory, customer management, export rekap pajak, manajemen admin lain |
| **Staff (Admin Operasional)** | Live orders (update status), inventory (lihat & update stok). Tidak dapat mengakses laporan keuangan/rekap pajak (dibatasi hanya untuk Owner, sesuai prinsip keamanan pada proposal) |

---

## 15. Roadmap & Milestone

| Fase | Durasi | Output |
|---|---|---|
| **Fase 1 — Discovery & Design** | Minggu 1–2 | Finalisasi PRD, wireframe hi-fi, skema database final |
| **Fase 2 — Core Backend** | Minggu 3–5 | API order, auth admin, integrasi payment gateway (sandbox) |
| **Fase 3 — Core Frontend** | Minggu 3–6 | Landing page, flow pemesanan, halaman pembayaran, tracking |
| **Fase 4 — Admin Dashboard** | Minggu 6–8 | Live orders, inventory, financial report, customer management |
| **Fase 5 — Fitur Pendukung** | Minggu 8–9 | E-nota, stempel digital, rekap pajak export |
| **Fase 6 — Testing & UAT** | Minggu 9–10 | Testing end-to-end dengan pemilik UMKM, perbaikan bug |
| **Fase 7 — Go-Live** | Minggu 11 | Deploy production, pelatihan penggunaan untuk pemilik/staff |

---

## 16. Risiko & Asumsi

### 16.1 Risiko

| Risiko | Mitigasi |
|---|---|
| Payment gateway downtime | Tombol fallback "Saya Sudah Bayar" + verifikasi manual oleh admin sebagai cadangan |
| Pelanggan tidak familiar dengan sistem baru | Desain flow sesederhana mungkin, pendampingan awal oleh staff toko |
| Data pelanggan (no. telepon) disalahgunakan | Enkripsi data, akses admin dibatasi, audit log |
| Kesalahan hitung rekap pajak dianggap sebagai laporan resmi | Disclaimer jelas di UI bahwa fitur ini alat bantu internal, bukan pelaporan resmi ke DJP |
| Koneksi internet toko tidak stabil | Optimasi frontend, retry mechanism pada API call |

### 16.2 Asumsi
- UMKM Fotocopy Cakrawala hanya memiliki satu lokasi usaha (tidak multi-cabang di MVP).
- Pemilik usaha bersedia menggunakan payment gateway pihak ketiga berlisensi resmi BI untuk QRIS dinamis.
- Perangkat admin (komputer/laptop toko) memiliki koneksi internet yang memadai untuk mengakses dashboard.

---

## 17. Lampiran

- Referensi standar QRIS: Bank Indonesia (2024), *Quick Response Code Indonesian Standard (QRIS)*.
- Dokumen sumber: Proposal Lomba Inovasi Daerah Masyarakat Berbasis Digitalisasi Pembayaran — DIGICAKRA, Universitas Tadulako, BRIDA Provinsi Sulawesi Tengah 2026.
- Surat Pernyataan Orisinalitas & Surat Pernyataan Pemilik UMKM tersedia pada dokumen proposal asli.

---

*Dokumen ini merupakan PRD teknis turunan dari proposal lomba dan dapat disesuaikan lebih lanjut seiring proses pengembangan.*
