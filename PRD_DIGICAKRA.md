# Product Requirements Document (PRD)
# DIGICAKRA — One-Stop QRIS Solution untuk UMKM Fotocopy Cakrawala

**Versi Dokumen:** 2.0 (Update: menyesuaikan Tabel Timeline Pengerjaan & Daftar Fitur Final)
**Tanggal:** 6 Juli 2026
**Disusun oleh:** Dareean Ahmad Raffi Mardin, Claudya Christy Koloay, Muhammad Naufal Amar
**Institusi:** Universitas Tadulako — untuk Lomba Inovasi Daerah Masyarakat Berbasis Digitalisasi Pembayaran, BRIDA Provinsi Sulawesi Tengah 2026
**Status:** Draft untuk Pengembangan — Siklus 30 Hari

---

## Catatan Perubahan dari Versi 1.0
- Identitas pelanggan diubah dari "nomor telepon" generik menjadi **nomor WhatsApp** (konsisten di seluruh fitur: tracking, e-nota, stempel digital, data pelanggan).
- Status pesanan disederhanakan menjadi 4 tahap yang terlihat pelanggan (**Diterima → Diproses → Siap Diambil → Selesai**), dengan status "menunggu pembayaran" sebagai status internal tersembunyi sebelum "Diterima".
- Fitur baru: **Kasir (POS)** untuk transaksi pelanggan walk-in, mendukung QRIS **maupun tunai/manual**.
- Fitur baru: **Pencatatan Pajak PPN & PPh otomatis** berdasarkan tarif standar, bukan sekadar rekap omzet.
- Fitur baru: **Kelola Katalog ATK** (CRUD penuh oleh admin) — sebelumnya hanya monitoring stok.
- Layanan cetak kini mendukung **add-on Jilid & Laminating** setelah upload dokumen.
- Laporan transaksi kini mencakup periode **mingguan**, selain harian/bulanan/tahunan.
- Ditambahkan bagian Tim & Tupoksi, Timeline Pengerjaan 30 Hari, dan Metodologi Pengujian (White Box & Black Box).

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
15. [Tim & Tupoksi](#15-tim--tupoksi)
16. [Timeline Pengerjaan (30 Hari)](#16-timeline-pengerjaan-30-hari)
17. [Metodologi Pengujian](#17-metodologi-pengujian)
18. [Risiko & Asumsi](#18-risiko--asumsi)
19. [Lampiran](#19-lampiran)

---

## 1. Ringkasan Eksekutif

DIGICAKRA (Digital Cakrawala) adalah platform digital terintegrasi berbasis QRIS untuk UMKM Fotocopy Cakrawala, mencakup pemesanan jasa cetak online, pemesanan ATK, kasir (POS) untuk pelanggan walk-in, pembayaran QRIS maupun tunai, pencatatan pajak otomatis (PPN & PPh), tracking pesanan real-time, e-nota digital, dan program loyalitas stempel digital — seluruhnya diidentifikasi menggunakan **nomor WhatsApp pelanggan** tanpa perlu membuat akun.

Produk terdiri dari dua permukaan utama:
- **Customer-facing web app** (tanpa login) — pemesanan jasa & ATK, pembayaran QRIS, tracking status via nomor WhatsApp.
- **Admin dashboard** (login aman) — monitoring transaksi, kelola pesanan, kelola katalog ATK, monitoring stok, verifikasi pembayaran, kasir (POS), pencatatan pajak, laporan transaksi, dan manajemen data pelanggan.

**Tech Stack:** Fullstack Next.js (App Router) — frontend (React Server & Client Components) sekaligus backend (API Route Handlers/Server Actions) dalam satu codebase, Prisma ORM + MySQL sebagai database, NextAuth.js untuk autentikasi admin, integrasi payment gateway QRIS pihak ketiga (mis. Midtrans/Xendit) sesuai standar Bank Indonesia.

**Tim Pengembang:** Claudya Christy Koloay (Project Manager/System Analyst), Dareean Ahmad Raffi Mardin (Frontend Developer & UI/UX), Muhammad Naufal Amar (Backend Developer).

**Durasi Pengerjaan:** 30 hari (1–30 Juli 2026), dari observasi awal hingga finalisasi & dokumentasi.

---

## 2. Latar Belakang & Masalah

Berdasarkan observasi pada UMKM Fotocopy Cakrawala:

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | QRIS belum terintegrasi dengan sistem administrasi | Data pembayaran tidak otomatis tercatat |
| 2 | Pencatatan transaksi manual | Rawan human error |
| 3 | Rekapitulasi pajak (PPN/PPh) manual, tidak terhubung data transaksi | Proses lambat, rawan salah hitung |
| 4 | Pelanggan wajib datang langsung menyerahkan dokumen | Tidak efisien, antre lama |
| 5 | Nota transaksi berbasis kertas | Sulit diarsipkan, boros |
| 6 | Monitoring stok manual | Pemilik tidak tahu stok real-time |
| 7 | Pengelolaan ATK manual | Sulit mengetahui ketersediaan barang akurat |
| 8 | Transaksi pelanggan yang datang langsung ke toko (walk-in) belum tercatat dalam sistem yang sama dengan transaksi online | Data penjualan terpecah, laporan tidak menyeluruh |

---

## 3. Tujuan Produk & Metrik Keberhasilan

### 3.1 Tujuan
1. Mengintegrasikan pemesanan online, transaksi walk-in (kasir), pembayaran (QRIS & tunai), dan administrasi dalam satu sistem.
2. Menghilangkan kebutuhan pelanggan datang langsung hanya untuk menyerahkan dokumen.
3. Mengotomatiskan pencatatan transaksi, stok, dan perhitungan pajak (PPN & PPh).
4. Menyediakan e-nota digital dan program loyalitas pelanggan (stempel digital) berbasis nomor WhatsApp.
5. Menyediakan dashboard monitoring & kasir bagi pemilik usaha dan staf.

### 3.2 Indikator Keberhasilan (KPI)

| Metrik | Target (3 bulan pasca-peluncuran) |
|---|---|
| % transaksi (online + walk-in) tercatat dalam sistem | 100% |
| Waktu rata-rata proses pesanan (submit → siap diambil) | Berkurang ≥ 30% dibanding proses manual |
| Kesalahan pencatatan transaksi/stok | Mendekati 0% |
| Waktu penyusunan rekap pajak bulanan | Berkurang ≥ 70% (otomatis vs manual) |
| Retensi pelanggan (repeat order via stempel) | ≥ 25% pelanggan bertransaksi ulang |
| Uptime sistem admin | ≥ 99% |
| Waktu transaksi kasir walk-in | < 1 menit per transaksi |

---

## 4. Target Pengguna & Persona

### Persona 1 — Pelanggan Online (Rina, 24 tahun, mahasiswa)
Pesan print skripsi dari rumah, bayar QRIS, pantau status via WhatsApp, ambil saat sudah siap.

### Persona 2 — Pelanggan Walk-in (Pak Budi, datang langsung ke toko)
Datang langsung ke toko untuk fotokopi cepat, dilayani lewat kasir (POS), bayar tunai atau QRIS di tempat.

### Persona 3 — Pemilik Usaha (Bu Herlina)
Butuh melihat omzet, pajak (PPN/PPh) otomatis, stok, dan laporan transaksi tanpa hitung manual — baik dari transaksi online maupun walk-in.

### Persona 4 — Staf Kasir/Operasional
Melayani pelanggan walk-in via kasir (POS), memproses pesanan online yang masuk, memperbarui status pesanan, memantau stok.

---

## 5. Ruang Lingkup (Scope)

### 5.1 In-Scope (MVP — 30 Hari)

**Fitur Pelanggan:**
- Pemesanan Jasa Online (print, cetak foto) dengan opsi tambahan **jilid & laminating** setelah upload dokumen
- Katalog ATK (lihat produk, harga, deskripsi, stok)
- Pemesanan ATK
- Pembayaran QRIS
- Tracking Pesanan Real-Time via nomor WhatsApp
- E-Nota digital
- Program Stempel Digital via nomor WhatsApp

**Fitur Admin:**
- Login Admin
- Dashboard Monitoring (ringkasan transaksi, pesanan, stok, pendapatan)
- Kelola Pesanan Jasa (termasuk opsi tambahan jilid/laminating)
- Kelola Katalog ATK (tambah/ubah/hapus produk)
- Monitoring Stok ATK + notifikasi stok menipis
- Verifikasi Pembayaran QRIS
- Tracking Status Pesanan (update status: Diterima → Diproses → Siap Diambil → Selesai)
- Pencatatan Pajak otomatis (PPN & PPh) berdasarkan tarif standar
- Laporan Transaksi (harian, mingguan, bulanan)
- E-Nota (kelola & kirim ulang)
- Kelola Data Pelanggan (riwayat berdasarkan nomor WhatsApp)
- **Kasir (POS)** untuk transaksi walk-in, mendukung QRIS atau tunai/manual

### 5.2 Out-of-Scope (MVP)
- Pelaporan pajak resmi ke DJP / e-Faktur (fitur pajak murni alat bantu hitung & rekap internal)
- Aplikasi mobile native (versi awal web responsif)
- Multi-cabang / multi-tenant
- Sistem pengiriman/kurir (pengambilan hanya di lokasi)
- Live chat customer support

### 5.3 Future Scope (Post-MVP)
- Notifikasi WhatsApp otomatis (integrasi WhatsApp Business API untuk update status pesanan)
- Aplikasi mobile untuk admin/kasir
- Multi-cabang
- Integrasi akuntansi pihak ketiga

---

## 6. User Stories

### Sebagai Pelanggan
- Sebagai pelanggan, saya ingin memesan layanan print tanpa membuat akun, agar prosesnya cepat.
- Sebagai pelanggan, saya ingin menambahkan opsi jilid/laminating setelah upload dokumen, agar tidak perlu pesan terpisah.
- Sebagai pelanggan, saya ingin membayar via QRIS dan melihat konfirmasi otomatis, agar tidak perlu verifikasi manual.
- Sebagai pelanggan, saya ingin melacak status pesanan saya menggunakan nomor WhatsApp, agar tahu kapan harus mengambil.
- Sebagai pelanggan, saya ingin menerima e-nota digital, agar punya bukti transaksi tanpa kertas.
- Sebagai pelanggan setia, saya ingin mengumpulkan stempel digital berbasis nomor WhatsApp saya, agar mendapat potongan harga/hadiah.

### Sebagai Pelanggan Walk-in
- Sebagai pelanggan yang datang langsung ke toko, saya ingin transaksi saya tetap dicatat sistem (via kasir), agar tetap mendapat e-nota dan stempel digital.

### Sebagai Pemilik Usaha / Admin
- Sebagai pemilik usaha, saya ingin login ke dashboard admin secara aman, agar data usaha saya terlindungi.
- Sebagai pemilik usaha, saya ingin melihat pesanan masuk secara real-time (online & walk-in), agar bisa segera memprosesnya.
- Sebagai pemilik usaha, saya ingin mengelola katalog ATK penuh (tambah/ubah/hapus produk), agar data produk selalu akurat.
- Sebagai pemilik usaha, saya ingin stok otomatis berkurang saat transaksi sukses (baik online maupun kasir), agar saya tahu kapan harus restock.
- Sebagai pemilik usaha, saya ingin pajak PPN & PPh dihitung otomatis dari omzet, agar tidak perlu hitung manual.
- Sebagai pemilik usaha, saya ingin melihat laporan transaksi harian/mingguan/bulanan, agar bisa mengambil keputusan bisnis lebih cepat.
- Sebagai staf kasir, saya ingin mencatat transaksi pelanggan yang datang langsung dan menerima pembayaran tunai atau QRIS, agar semua transaksi toko tercatat dalam satu sistem.
- Sebagai admin, saya ingin memperbarui status pesanan (Diterima → Diproses → Siap Diambil → Selesai), agar pelanggan mendapat info akurat.

---

## 7. Functional Requirements

### 7.1 Fitur Admin

| ID | Fitur | Deskripsi |
|---|---|---|
| FR-A01 | Login Admin | Autentikasi username & password (hashed), token-based session |
| FR-A02 | Dashboard Monitoring | Ringkasan transaksi, jumlah pesanan aktif, status stok ATK, pendapatan hari ini/bulan ini |
| FR-A03 | Kelola Pesanan Jasa | Melihat & memproses pesanan print/cetak foto, termasuk opsi tambahan jilid & laminating yang dipilih pelanggan setelah upload dokumen |
| FR-A04 | Kelola Katalog ATK | CRUD penuh: tambah, ubah, hapus, perbarui produk ATK (nama, harga, stok, kategori, status aktif) |
| FR-A05 | Monitoring Stok ATK | Pantau ketersediaan stok real-time, notifikasi otomatis saat stok mendekati/mencapai ambang minimum |
| FR-A06 | Verifikasi Pembayaran QRIS | Verifikasi otomatis via webhook payment gateway; fallback verifikasi manual oleh admin bila diperlukan |
| FR-A07 | Tracking Status Pesanan | Update status pesanan: (internal) Menunggu Pembayaran → **Diterima** → **Diproses** → **Siap Diambil** → **Selesai** |
| FR-A08 | Pencatatan Pajak (PPN & PPh) | Kalkulasi otomatis PPN & PPh dari total omzet transaksi menggunakan tarif standar yang dapat dikonfigurasi admin, per periode |
| FR-A09 | Laporan Transaksi | Laporan & cetak transaksi harian, mingguan, bulanan (mencakup transaksi online & kasir) |
| FR-A10 | E-Nota | Generate & kelola nota digital, kirim ulang ke pelanggan |
| FR-A11 | Kelola Data Pelanggan | Riwayat transaksi pelanggan berdasarkan nomor WhatsApp, jumlah stempel, dan poin |
| FR-A12 | Kasir (POS) | Input transaksi pelanggan walk-in (bukan lewat aplikasi), mendukung pembayaran QRIS (generate QR di kasir) atau tunai/manual (dicatat langsung sebagai lunas oleh admin) |

### 7.2 Fitur Pelanggan (User)

| ID | Fitur | Deskripsi |
|---|---|---|
| FR-U01 | Pemesanan Jasa Online | Pilih layanan (print, cetak foto), upload dokumen, tambahkan opsi jilid/laminating sebagai add-on, input nomor WhatsApp |
| FR-U02 | Katalog ATK | Lihat daftar produk ATK: harga, deskripsi singkat, status stok |
| FR-U03 | Pemesanan ATK | Pilih produk ATK, tentukan jumlah, checkout |
| FR-U04 | Pembayaran QRIS | Bayar via QR dinamis, status terverifikasi otomatis |
| FR-U05 | Tracking Pesanan Real-Time | Cek status pesanan menggunakan nomor WhatsApp hingga siap diambil |
| FR-U06 | E-Nota | Terima nota digital sebagai bukti transaksi |
| FR-U07 | Program Stempel Digital | Kumpulkan stempel per transaksi (berdasarkan nomor WhatsApp), tukar dengan promo/hadiah sesuai ketentuan UMKM |

---

## 8. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Keamanan** | Password admin di-hash (bcrypt); autentikasi sesi via NextAuth.js (Credentials Provider + JWT/session cookie httpOnly); nomor WhatsApp pelanggan disimpan terenkripsi at-rest; HTTPS wajib; rate limiting pada Route Handler publik (mis. via middleware Next.js); verifikasi pembayaran QRIS server-side via webhook resmi (Route Handler khusus, signature-verified); transaksi kasir tunai dicatat dengan jejak audit (admin/kasir yang menginput) |
| **Kehandalan** | Uptime admin dashboard ≥ 99%; transaksi, stok, dan pajak diproses dalam satu database transaction (atomic); sistem tetap dapat diakses meski koneksi lambat |
| **Kemudahan Pengguna** | Alur pemesanan pelanggan maksimal 4 langkah tanpa registrasi; alur kasir (POS) maksimal 3 langkah untuk staf; desain mobile-first & responsif |
| **Skalabilitas** | Arsitektur modular berbasis folder `lib/services` (Order, Payment, Inventory, Tax, POS, Loyalty) yang dipanggil dari Route Handlers/Server Actions, memudahkan penambahan fitur/cabang di masa depan |
| **Kepatuhan** | Pembayaran QRIS mengikuti standar Bank Indonesia via payment gateway berlisensi; fitur pajak (PPN/PPh) dinyatakan eksplisit sebagai alat bantu hitung & rekap internal, bukan pelaporan resmi ke DJP |
| **Performa** | Waktu load halaman pemesanan < 2 detik pada 4G; update dashboard admin real-time (maks delay 5 detik); transaksi kasir diproses < 5 detik |

---

## 9. Arsitektur Sistem

### 9.1 Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        Next.js App (satu codebase)                      │
│                                                                         │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │  Customer Pages       │  │   Admin Dashboard      │  │  Kasir (POS)   │ │
│  │  (Server/Client        │  │   Pages (protected      │  │  Page          │ │
│  │   Components, publik) │  │   via NextAuth session) │  │  (bagian Admin)│ │
│  └──────────┬───────────┘  └───────────┬────────────┘  └───────┬───────┘ │
│             │                          │                        │        │
│             └─────────────┬────────────┴────────────┬───────────┘        │
│                            ▼                         ▼                    │
│                 ┌───────────────────────────────────────┐                │
│                 │   API Route Handlers / Server Actions   │                │
│                 │   (app/api/**, app/**/actions.ts)       │                │
│                 │  - Order Service        - Tax Service   │                │
│                 │  - Payment Service      - Report Service│                │
│                 │  - Inventory Service    - Loyalty Service│               │
│                 │  - POS Service          - Auth (NextAuth)│               │
│                 └──────────────────┬───────────────────────┘                │
└────────────────────────────────────┼──────────────────────────────────────┘
                                      │  Prisma ORM
          ┌───────────────────────────┼────────────────────────┐
          ▼                           ▼                          ▼
   ┌─────────────┐          ┌──────────────────┐       ┌──────────────────┐
   │   MySQL DB   │          │  File Storage      │       │  QRIS Payment      │
   │  (via Prisma)│          │  (dokumen upload,  │       │  Gateway (mis.     │
   │              │          │   e-nota PDF —     │       │  Midtrans/Xendit)  │
   │              │          │   local/S3-compat)  │       │                    │
   └─────────────┘          └──────────────────┘       └──────────────────┘
                                                                   │
                                                          Webhook callback
                                                          → /api/payments/webhook
```

### 9.2 Komponen Utama
- **Frontend (Next.js App Router + React + Tailwind CSS):** landing page, form pemesanan (dengan add-on jilid/laminating), katalog ATK, halaman pembayaran, tracking, dashboard admin, layar kasir (POS). Menggunakan Server Components untuk halaman data-heavy (dashboard, laporan) dan Client Components untuk interaksi (form, real-time status).
- **Backend (Next.js API Route Handlers & Server Actions):** satu codebase dengan frontend — autentikasi (NextAuth.js), order management, POS/kasir, integrasi payment gateway, inventory service, tax service (PPN/PPh), reporting service, loyalty service. Endpoint publik (`/api/...`) dan endpoint admin (dilindungi middleware sesi) berada dalam struktur `app/api/`.
- **ORM & Database (Prisma + MySQL):** Prisma Client menangani seluruh query & migrasi skema; `orders` membedakan transaksi online vs walk-in via kolom `order_source`.
- **File Storage:** dokumen upload pelanggan & file e-nota PDF (disimpan lokal atau object storage S3-compatible, diakses via Route Handler upload).
- **Payment Gateway:** QR dinamis, validasi pembayaran, webhook — digunakan baik untuk transaksi online maupun QRIS di kasir.

---

## 10. Skema Database

### 10.1 Entity Relationship (ringkas)

```
customers ──< orders ──< order_items >── products
                │            │
                │            └──< order_addons (jilid, laminating)
                ├──< payments
                ├──< notes (e-nota)
                └──< stamps (loyalty)

admins ──< orders (sebagai processed_by / cashier_id, khusus order_source = pos)
tax_settings ──< tax_reports
inventory_items ──< inventory_logs
```

### 10.2 Tabel Utama

**customers**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| whatsapp_number | VARCHAR(20) UNIQUE | identitas utama pelanggan (menggantikan phone_number) |
| name | VARCHAR(100) | opsional, diisi saat order |
| total_stamps | INT DEFAULT 0 | akumulasi stempel |
| created_at / updated_at | TIMESTAMP | |

**orders**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_code | VARCHAR(20) UNIQUE | mis. #ORD-092 |
| customer_id | BIGINT FK → customers | nullable untuk walk-in tanpa nomor WA (opsional diisi) |
| order_source | ENUM('online','pos') | membedakan pesanan aplikasi vs kasir |
| cashier_id | BIGINT FK → admins, NULLABLE | diisi jika order_source = 'pos' |
| order_type | ENUM('print','atk','mixed') | |
| status | ENUM('menunggu_pembayaran','diterima','diproses','siap_diambil','selesai','dibatalkan') | status internal 'menunggu_pembayaran' tidak ditampilkan ke pelanggan |
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
| spec_json | JSON | detail spesifikasi (halaman, warna, ukuran) |
| qty | INT | |
| unit_price | DECIMAL(12,2) | |
| subtotal | DECIMAL(12,2) | |

**order_addons** (baru — opsi tambahan seperti jilid & laminating)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_item_id | BIGINT FK → order_items | |
| addon_type | ENUM('jilid','laminating') | |
| price | DECIMAL(12,2) | |

**products** (katalog ATK — CRUD penuh oleh admin)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(100) | |
| description | VARCHAR(255) | |
| price | DECIMAL(12,2) | |
| stock_qty | INT | |
| category | VARCHAR(50) | |
| is_active | BOOLEAN | |
| created_by / updated_by | BIGINT FK → admins | audit trail CRUD |

**payments**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT FK → orders | |
| payment_method | ENUM('qris','cash','manual') | 'cash'/'manual' hanya untuk order_source = 'pos' |
| payment_gateway_ref | VARCHAR(100) NULLABLE | ID transaksi dari gateway (khusus QRIS) |
| qr_string | TEXT NULLABLE | payload QRIS |
| amount | DECIMAL(12,2) | |
| status | ENUM('pending','success','failed','expired') | |
| verified_by | BIGINT FK → admins, NULLABLE | diisi jika verifikasi manual (kasir/admin) |
| paid_at | TIMESTAMP NULLABLE | |
| webhook_payload | JSON NULLABLE | raw data callback untuk audit |

**inventory_items** (bahan operasional: kertas, tinta, dll — terpisah dari produk ATK jual)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| item_name | VARCHAR(100) | |
| unit | VARCHAR(20) | rim, botol, pack |
| current_qty | INT | |
| min_threshold | INT | untuk notifikasi stok menipis |

**inventory_logs**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| inventory_item_id | BIGINT FK | |
| change_qty | INT | negatif (pemakaian) / positif (restock) |
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
| role | ENUM('owner','staff') | staf dapat mengoperasikan kasir & live orders |
| created_at / updated_at | TIMESTAMP | |

**tax_settings** (baru — konfigurasi tarif pajak)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| tax_type | ENUM('ppn','pph') | |
| rate_percent | DECIMAL(5,2) | mis. 11.00 untuk PPN, dapat diubah admin |
| effective_from | DATE | berlaku sejak tanggal tertentu (jika tarif berubah) |
| is_active | BOOLEAN | |

**tax_reports** (hasil kalkulasi otomatis per periode)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT PK | |
| period_type | ENUM('harian','mingguan','bulanan','tahunan') | |
| period_value | VARCHAR(20) | mis. "2026-07" atau "2026-W27" |
| total_revenue | DECIMAL(14,2) | omzet kotor periode tsb |
| ppn_amount | DECIMAL(14,2) | dihitung otomatis dari total_revenue × tarif PPN aktif |
| pph_amount | DECIMAL(14,2) | dihitung otomatis dari total_revenue × tarif PPh aktif |
| generated_at | TIMESTAMP | |
| file_url | VARCHAR(255) | export PDF/Excel |

---

## 11. Spesifikasi API

Seluruh endpoint diimplementasikan sebagai **Next.js API Route Handlers** di dalam `app/api/`. Base path: `https://digicakra.id/api`. Endpoint admin dilindungi middleware yang memvalidasi sesi NextAuth.js (role `owner`/`staff`); endpoint publik dibatasi rate limit via middleware Next.js.

### 11.1 Public Endpoints (Pelanggan) — `app/api/...`

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/products` | Daftar ATK aktif beserta stok |
| POST | `/api/orders` | Buat pesanan baru, body: whatsapp_number, items[] (termasuk addons: jilid/laminating), notes |
| GET | `/api/orders/track?whatsapp={no}` | Daftar pesanan berdasarkan nomor WhatsApp |
| GET | `/api/orders/{order_code}` | Detail satu pesanan |
| POST | `/api/payments/{order_id}/generate-qr` | Generate QRIS dinamis untuk pesanan |
| POST | `/api/payments/webhook` | Callback dari payment gateway (server-to-server, signature-verified) |
| GET | `/api/orders/{order_id}/note` | Unduh e-nota PDF |

### 11.2 Admin Endpoints (Perlu Sesi NextAuth — Route Handler Terproteksi)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/[...nextauth]` (signIn) | Login admin via NextAuth Credentials Provider, set session cookie httpOnly |
| POST | `/api/auth/[...nextauth]` (signOut) | Logout / invalidate sesi |
| GET | `/api/admin/orders` | List live orders (online & pos), filter status/tanggal/source |
| PATCH | `/api/admin/orders/{id}/status` | Update status pesanan (diterima/diproses/siap_diambil/selesai) |
| POST | `/api/admin/pos/orders` | Buat transaksi kasir (walk-in), body: items[], payment_method (qris/cash) |
| POST | `/api/admin/pos/orders/{id}/confirm-cash` | Konfirmasi pembayaran tunai/manual oleh kasir |
| GET | `/api/admin/products` | List katalog ATK (termasuk nonaktif) |
| POST | `/api/admin/products` | Tambah produk ATK baru |
| PUT | `/api/admin/products/{id}` | Ubah produk ATK |
| DELETE | `/api/admin/products/{id}` | Hapus/nonaktifkan produk ATK |
| GET | `/api/admin/inventory` | List bahan operasional + status stok |
| PATCH | `/api/admin/inventory/{id}` | Update stok (restock manual) |
| GET | `/api/admin/reports/transactions?period=harian|mingguan|bulanan` | Laporan transaksi (online + pos) |
| GET | `/api/admin/reports/tax?period=` | Hasil kalkulasi PPN & PPh otomatis periode tsb |
| GET | `/api/admin/reports/tax/export?period=&format=pdf|xlsx` | Ekspor rekap pajak |
| PUT | `/api/admin/settings/tax-rate` | Ubah tarif PPN/PPh aktif |
| GET | `/api/admin/customers` | List pelanggan (nomor WhatsApp) + riwayat & poin |
| GET | `/api/admin/dashboard/summary` | Ringkasan: pendapatan hari ini/bulan ini, pesanan aktif, stok menipis |

### 11.3 Format Response (contoh)

```json
// POST /orders — response
{
  "order_code": "ORD-093",
  "status": "menunggu_pembayaran",
  "total_amount": 26000,
  "addons": ["jilid"],
  "qr_payment_url": "/payments/93/generate-qr"
}
```

```json
// GET /admin/reports/tax?period=2026-07 — response
{
  "period": "2026-07",
  "total_revenue": 12400000,
  "ppn_rate": 11.0,
  "ppn_amount": 1364000,
  "pph_rate": 0.5,
  "pph_amount": 62000
}
```

---

## 12. Alur Pengguna (User Flow)

### 12.1 Alur Pelanggan Online — Pemesanan Print + Jilid
1. Pelanggan membuka landing page → klik "Print Dokumen"
2. Upload file, isi spesifikasi (jumlah halaman, warna, ukuran)
3. Sistem menawarkan opsi tambahan: **Jilid?** / **Laminating?**
4. Masukkan nomor WhatsApp
5. Sistem menampilkan ringkasan pesanan & total harga (termasuk add-on)
6. Sistem generate QRIS dinamis → status internal: `menunggu_pembayaran`
7. Pelanggan scan & bayar
8. Payment gateway kirim webhook → status pembayaran sukses → **status order otomatis berubah menjadi "Diterima"**
9. Stok bahan berkurang otomatis, e-nota digenerate
10. Pelanggan cek status via halaman tracking (input nomor WhatsApp) — hanya melihat 4 status: Diterima/Diproses/Siap Diambil/Selesai
11. Admin update status seiring progres pengerjaan
12. Pelanggan ambil pesanan, stempel loyalitas otomatis bertambah (berdasarkan nomor WhatsApp)

### 12.2 Alur Kasir (POS) — Pelanggan Walk-in
1. Pelanggan datang langsung ke toko
2. Staf membuka menu Kasir (POS) di dashboard admin
3. Staf input item (jasa cetak/ATK) dan opsi tambahan bila ada
4. Staf pilih metode bayar: **QRIS** (generate QR di layar kasir, tunggu konfirmasi otomatis) **atau Tunai/Manual** (staf klik "Konfirmasi Lunas" setelah menerima uang tunai)
5. Sistem mencatat transaksi dengan `order_source = pos`, mengurangi stok, membuat e-nota, dan menambah stempel loyalitas jika nomor WhatsApp pelanggan diinput
6. Transaksi otomatis masuk dalam laporan transaksi & perhitungan pajak bersama transaksi online

### 12.3 Alur Admin — Monitoring & Pajak
1. Admin login ke dashboard
2. Melihat ringkasan: pendapatan hari ini, pesanan aktif, stok menipis
3. Memproses "Live Orders" (online & pos) sesuai antrean
4. Mengecek "Monitoring Stok" → restock jika ada notifikasi
5. Di akhir periode (harian/mingguan/bulanan), buka menu Pajak → sistem otomatis menghitung PPN & PPh dari total omzet → admin ekspor PDF/Excel

### 12.4 Alur Pembayaran QRIS (Detail Teknis)
```
Order dibuat (online / pos) → status: menunggu_pembayaran
   → Backend call Payment Gateway API (generate QR)
   → Gateway return qr_string → ditampilkan
   → Pembayaran dilakukan via aplikasi bank/e-wallet
   → Gateway kirim webhook ke /payments/webhook (signed)
   → Backend verifikasi signature → payments.status = success
   → Backend trigger: orders.status = "diterima", kurangi stok,
     generate e-nota, tambah stempel, catat ke tax_reports periode berjalan
```

---

## 13. Referensi UI/UX

Berdasarkan mockup pada proposal awal, layar utama yang menjadi acuan desain:

1. **Landing Page** — Header (Layanan, Promo, Cara Kerja, Tracking Pesanan), hero dengan CTA "Pesan Sekarang", grid kategori layanan.
2. **Halaman Pembayaran** — Ringkasan pesanan (termasuk add-on jilid/laminating bila dipilih), rincian pembayaran & QR code, status real-time.
3. **Dashboard Admin** — Sidebar (Dashboard, Live Orders, Kasir/POS, Financials, Inventory, Products/Katalog ATK, Customers, Administration/Pajak), kartu ringkasan, tabel live orders, panel monitoring stok.
4. **Layar Kasir (POS)** — *(baru, perlu didesain di Fase Desain)*: tampilan input item cepat, pilihan metode bayar (QRIS/Tunai), tombol konfirmasi lunas.

Gaya visual: bersih, minimalis, aksen merah (brand DIGICAKRA), tipografi sans-serif, kartu bersudut membulat dengan bayangan tipis.

---

## 14. Role & Hak Akses (RBAC)

| Role | Akses |
|---|---|
| **Pelanggan (guest)** | Membuat pesanan, tracking via nomor WhatsApp, unduh e-nota sendiri. Tidak ada login. |
| **Owner (Pemilik Usaha)** | Akses penuh: live orders, kasir, financial report, pajak (lihat & ubah tarif), inventory, katalog ATK, customer management, manajemen admin lain |
| **Staff (Admin Operasional/Kasir)** | Live orders (update status), kasir/POS (input transaksi walk-in), inventory (lihat & update stok), katalog ATK (lihat & update stok, tanpa hapus produk). **Tidak** dapat mengakses laporan keuangan & pajak — dibatasi hanya untuk Owner |

---

## 15. Tim & Tupoksi

| Anggota | Role | Tugas |
|---|---|---|
| **Claudya Christy Koloay** | Project Manager / System Analyst | Mengatur timeline, komunikasi dengan dosen & UMKM, analisis kebutuhan, dokumentasi, Git/merge project, membantu testing, membantu frontend/backend bila diperlukan |
| **Dareean Ahmad Raffi Mardin** | Frontend Developer & UI/UX | Desain UI di Figma, membangun tampilan aplikasi (Landing Page, Login, Dashboard, Katalog ATK, Tracking Pesanan, Kasir/POS view, dll.) |
| **Muhammad Naufal Amar** | Backend Developer | Merancang skema database (Prisma), membangun API Route Handlers & Server Actions di Next.js, autentikasi (NextAuth.js), integrasi QRIS, monitoring stok, pencatatan pajak, laporan, dan menghubungkan data ke frontend |

---

## 16. Timeline Pengerjaan (30 Hari)

| Tanggal | Kegiatan | Output |
|---|---|---|
| 1 Juli 2026 | Survei awal, observasi UMKM, wawancara pemilik, dokumentasi | Data kebutuhan sistem & dokumentasi awal |
| 2 Juli 2026 | Analisis kebutuhan sistem, penentuan fitur aplikasi | Dokumen analisis kebutuhan & daftar fitur |
| 3 Juli 2026 | Perancangan Flowchart, Use Case Diagram, Activity Diagram, ERD | Dokumen perancangan sistem |
| 4 Juli 2026 | Pembuatan alternatif desain antarmuka (UI/UX) | Beberapa alternatif desain aplikasi |
| 5 Juli 2026 | Presentasi desain ke pemilik UMKM & finalisasi desain | Desain aplikasi disetujui |
| 6–14 Juli 2026 | Pengembangan frontend & backend aplikasi | Fitur utama selesai dikembangkan |
| 15–21 Juli 2026 | Integrasi seluruh fitur, penyempurnaan sistem, perbaikan bug | Aplikasi terintegrasi & siap diuji |
| 22 Juli 2026 | White Box Testing oleh tim pengembang | Hasil White Box Testing |
| 23 Juli 2026 | Perbaikan sistem berdasarkan hasil White Box Testing | Sistem lebih stabil |
| 24–28 Juli 2026 | Black Box Testing oleh pemilik UMKM & pelanggan, implementasi terbatas | Hasil Black Box Testing & masukan pengguna |
| 29 Juli 2026 | Finalisasi aplikasi, pengambilan testimoni, dokumentasi video | Video dokumentasi & testimoni |
| 30 Juli 2026 | Penyusunan laporan akhir & persiapan presentasi | Proposal, aplikasi, dan video siap dipresentasikan |

---

## 17. Metodologi Pengujian

### 17.1 White Box Testing (oleh Tim Pengembang) — 22 Juli 2026
- Menguji logika program pada tiap service (Order, Payment, Inventory, Tax, POS).
- Menguji fungsi dan alur sistem (unit test & integration test).
- Memastikan setiap modul (termasuk kalkulasi PPN/PPh dan status pesanan 4-tahap) berjalan benar.
- Memperbaiki bug yang ditemukan sebelum masuk fase Black Box.

### 17.2 Black Box Testing (oleh Pengguna) — 24–28 Juli 2026
- Pemilik UMKM mencoba seluruh fitur aplikasi (dashboard, kasir, katalog ATK, laporan, pajak).
- Pelanggan mencoba memesan jasa & ATK secara online (termasuk add-on jilid/laminating) dan melacak status via WhatsApp.
- Simulasi transaksi walk-in melalui kasir (QRIS & tunai).
- Pengguna mengisi form pengujian sesuai format dari dosen.
- Tim mencatat masukan untuk penyempurnaan aplikasi sebelum finalisasi.

---

## 18. Risiko & Asumsi

### 18.1 Risiko

| Risiko | Mitigasi |
|---|---|
| Payment gateway downtime | Fallback: kasir dapat mencatat pembayaran tunai/manual; tombol konfirmasi manual sebagai cadangan |
| Kekeliruan hitung PPN/PPh otomatis akibat tarif berubah | Tabel `tax_settings` dengan `effective_from` agar histori tarif tetap akurat, dan tarif dapat diubah Owner |
| Pelanggan tidak familiar dengan sistem baru | Alur pemesanan sesederhana mungkin, pendampingan awal oleh staf toko |
| Data nomor WhatsApp pelanggan disalahgunakan | Enkripsi data, akses admin dibatasi, audit log |
| Rekap pajak otomatis dianggap sebagai laporan resmi ke negara | Disclaimer jelas di UI: alat bantu internal, bukan pengganti pelaporan resmi ke DJP |
| Staf kasir keliru input transaksi tunai | Wajib konfirmasi 2 langkah (input nominal + konfirmasi lunas), tercatat dengan `verified_by` untuk audit |
| Koneksi internet toko tidak stabil | Optimasi frontend, retry mechanism pada API call |
| Timeline 30 hari sangat ketat untuk fitur sebanyak ini | Prioritaskan fitur P0 (login, order, pembayaran QRIS, tracking, dashboard) di sprint awal (6–14 Juli), fitur pendukung (POS detail, pajak, laporan mingguan) menyusul di sprint integrasi (15–21 Juli) |

### 18.2 Asumsi
- UMKM Fotocopy Cakrawala hanya memiliki satu lokasi usaha (tidak multi-cabang di MVP).
- Pemilik usaha bersedia menggunakan payment gateway pihak ketiga berlisensi resmi BI untuk QRIS dinamis (baik untuk online maupun kasir).
- Tarif PPN & PPh yang digunakan adalah tarif standar umum (dapat disesuaikan Owner sesuai kondisi usaha nyata) dan bukan perhitungan pajak resmi yang menggantikan konsultan pajak.
- Perangkat kasir (komputer/tablet toko) memiliki koneksi internet yang memadai.

---

## 19. Lampiran

- Referensi standar QRIS: Bank Indonesia (2024), *Quick Response Code Indonesian Standard (QRIS)*.
- Dokumen sumber 1: Proposal Lomba Inovasi Daerah Masyarakat Berbasis Digitalisasi Pembayaran — DIGICAKRA, Universitas Tadulako, BRIDA Provinsi Sulawesi Tengah 2026.
- Dokumen sumber 2: Tabel Timeline Pengerjaan Aplikasi DIGICAKRA (30 Hari), Pembagian Tugas/Tupoksi, dan Daftar Fitur Final.

---

*Dokumen ini merupakan PRD teknis versi 2.0, hasil penyesuaian dari proposal awal dengan timeline pengerjaan dan daftar fitur final tim. Dapat disesuaikan lebih lanjut seiring proses pengembangan berjalan.*
