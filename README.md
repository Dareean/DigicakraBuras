# DIGICAKRA — One-Stop QRIS Solution untuk UMKM Fotocopy Cakrawala

Proyek ini dikembangkan untuk mengintegrasikan pemesanan layanan cetak/fotokopi, pembelian ATK, pembayaran QRIS, pencatatan transaksi, monitoring stok, e-nota, dan program loyalitas pelanggan (stempel digital) dalam satu platform digital terintegrasi.

## Struktur Direktori

- `/backend` — REST API berbasis Laravel.
- `/frontend` — Customer Web App & Admin Dashboard berbasis Next.js (React).
- `docker-compose.yml` — Konfigurasi environment database MySQL lokal.

## Persyaratan Sistem

Pastikan Anda memiliki tools berikut terinstal di mesin lokal Anda:
1. Docker & Docker Compose
2. PHP >= 8.1 & Composer (untuk menjalankan Laravel secara lokal jika tidak melalui Docker)
3. Node.js >= 18 & npm (untuk menjalankan Next.js secara lokal)

## Cara Memulai

### 1. Menjalankan Database (Docker)
Jalankan database MySQL menggunakan Docker Compose:
```bash
docker compose up -d
```
Database akan berjalan di port `3306` dengan:
- Database: `digicakra`
- User: `digicakra_user`
- Password: `digicakra_password`
- Root Password: `root`

### 2. Setup Backend (Laravel)
Masuk ke direktori backend:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### 3. Setup Frontend (Next.js)
Masuk ke direktori frontend:
```bash
cd frontend
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.
