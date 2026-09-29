# setia.id

Platform undangan digital yang dibangun dengan React dan Vite.

## Menjalankan aplikasi

```sh
npm install
npm start
```

Buka http://localhost:3000 untuk melihat aplikasi.

## Akun tester

Panel CMS frontend memakai akun lokal berikut. Akun ini tersimpan di `localStorage`, sehingga cocok untuk QA browser lokal:

| Panel | URL | Username | Password |
| --- | --- | --- | --- |
| Portal | `/admin` | `admin` | `admin123` |
| Gibrig Entertainment | `/gibrig-admin` | `gibrigadmin` | `gibrig123` |
| Nunuy Nadhifa Wedding | `/nunuy-admin` | `nunuyadmin` | `nunuy123` |
| Undangan.id | `/undangan-admin` | akun admin backend | konfigurasi `backend/.env` |

Untuk membuat akun user tester backend pada database lokal atau staging, jalankan dari root project:

```sh
python3 backend/seed_test_account.py
```

Akun yang dibuat adalah `tester@undangan.id` dengan password `Tester12345!`. Jangan jalankan seed ini pada production.

## Pengujian dan build

```sh
npm test -- --run
npm run build
```

## Backend API

Backend FastAPI menggunakan MongoDB untuk akun pengguna, draft undangan, konfigurasi paket, dan order pembayaran. Pastikan MongoDB tersedia, lalu jalankan:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000
```

Sebelum menjalankan server, isi `JWT_SECRET` di `backend/.env` dengan nilai acak minimal 32 karakter dan atur `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, serta `MIDTRANS_SERVER_KEY`. Buat JWT secret dengan `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`; buat hash password admin dengan `python3 -c "import getpass, bcrypt; print(bcrypt.hashpw(getpass.getpass().encode(), bcrypt.gensalt()).decode())"`. Pastikan MongoDB aktif. Gunakan server key sandbox sampai akun Midtrans produksi disiapkan. Atur `CORS_ORIGINS` untuk origin domain produksi.

API tersedia di `http://localhost:8000/api`; dokumentasi interaktif tersedia di `http://localhost:8000/docs`. Login admin ada di `http://localhost:3000/undangan-admin`; pemilik mengelola draft, pembayaran, masa aktif, dan publish di `http://localhost:3000/undangan-dashboard`.

`POST /api/payments/midtrans/notification` harus dipasang sebagai payment notification URL pada dashboard Midtrans: `https://<domain-api>/api/payments/midtrans/notification`. Pembayaran GoPay/QRIS menggunakan halaman Snap Midtrans. Metode rekening manual dapat ditambahkan dari panel admin dan harus diverifikasi admin setelah referensi transfer dikirim.

Nilai paket awal adalah contoh yang bisa disesuaikan: Basic 30 hari, 1 undangan, link otomatis; Premium 365 hari, 3 undangan, link pilihan; Business 365 hari, hingga 100 undangan, link pilihan. Admin dapat mengubah harga, masa aktif, kuota, hak link, metode pembayaran, konten, dan status aktif. Untuk menerima pembayaran sungguhan, lengkapi credential merchant Midtrans dan URL webhook publik; tanpa MongoDB, JWT secret, dan konfigurasi merchant, alur transaksi belum aktif.
