# setia.id

Platform undangan digital yang dibangun dengan React dan Vite.

## Portal.id

Beranda `/` menampilkan portal tiga brand: Nunuy Nadhifa Wedding, Musik.id, dan Undangan.id. Panel `/admin` menyediakan editor konten dan gambar hero/kartu brand, slot iklan Top Banner/Mid-Feed/Sidebar/Floating Bottom, 20 preset visual, Google Fonts terpisah per brand, warna, spacing, radius, dan animasi. Konfigurasi portal disimpan di browser, dapat dipublikasikan dari panel, serta diekspor atau diimpor sebagai JSON.

Admin Portal lokal: `admin` / `admin123`.

## Menjalankan aplikasi

```sh
npm install
npm start
```

Buka http://localhost:3000 untuk melihat aplikasi.

## Panel super admin

Masuk sekali melalui `/setia-creative-admin` menggunakan akun admin backend (`ADMIN_EMAIL` dan `ADMIN_PASSWORD_HASH` pada `backend/.env`). URL khusus admin tidak ditampilkan di navigasi website publik. Panel konten website tersedia di `/portal-admin`, `/gibrig-admin`, `/nunuy-admin`, dan `/undangan-website-admin`; panel paket dan pembayaran Undangan.id tersedia di `/undangan-admin`. Setelah login super admin, semua link panel dapat dibuka tanpa login ulang; sesi bersama disimpan selama tab browser aktif.

Setiap panel website menyediakan editor untuk semua nilai konten, logo, gambar hero, warna, font, ukuran, nomor HP, dan WhatsApp, serta 100 template desain original per website. Template publik Undangan.id dapat difilter melalui tombol kategori; kategori tanpa template aktif tidak ditampilkan. Setiap website memiliki nomor kontak sendiri; tombol WhatsApp publik memakai nomor dan pesan pembuka yang diatur di panel website terkait. Perubahan konten dan gambar disimpan di `localStorage` browser yang dipakai; gunakan browser/perangkat yang sama untuk melihat perubahan tersebut. Website Gibrig, Nunuy, dan Undangan.id memiliki menu Beranda yang menuju Portal Iklan.

Dashboard pembuat undangan menyediakan desain inspirasi untuk seluruh 38 provinsi, opsi video latar MP4/WebM atau video YouTube/Vimeo, animasi yang menghormati preferensi reduced-motion, dan template editorial Gen Z. Editor menyesuaikan kolom nama untuk pasangan atau nama orang/agenda yang dirayakan. Tautan WhatsApp undangan resmi dapat dipersonalisasi dengan nama calon tamu; nama tersebut tampil di sampul melalui parameter `to` pada tautan.

Setiap undangan yang sudah dipublikasikan menyediakan QR khusus pemilik. Memindai QR akan membuka dashboard pada buku tamu undangan tersebut; jika perlu, pemilik login lebih dahulu dan kemudian diarahkan kembali ke buku tamu.

Pemilik paket Business dapat mendaftarkan maksimal tiga admin buku tamu. Super Admin mengatur pilihan kombinasi kuota affiliate; pemilik Business mengonfirmasi satu kombinasi sebelum mendaftarkan affiliate. Kombinasi yang dipilih dikunci permanen. Iklan affiliate yang diaktifkan pemilik tampil pada halaman depan Undangan.id selama akses Business masih aktif, sedangkan penjualan tetap tercatat pada pemilik Business.

Super Admin Undangan.id juga dapat membuat akun demo dengan memilih paket dan masa akses dalam hari/jam. Akun demo dapat membuat maksimal dua undangan, tidak dapat membayar, dan login akun serta akun turunannya ditolak setelah masa demo berakhir.

Untuk membuat akun tester dengan akses fitur Business tanpa batas dan masa aktif permanen pada database MongoDB lokal, jalankan dari root project:

```sh
python3 backend/seed_test_account.py
```

Akun yang dibuat adalah `tester@undangan.id` dengan password `Tester12345!`. Seed ini memperbarui akun tersebut dan mengaktifkan undangan QA yang sudah ada. Seed menolak koneksi MongoDB non-lokal; jangan mengubah guard ini atau memakai kredensial tester di production. Jalankan backend dan MongoDB lokal sebelum menjalankan seed.

## Pengujian dan build

```sh
npm test -- --run
npm run build
python -m pytest backend/test_server.py -q
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

Sebelum menjalankan server, isi `JWT_SECRET` di `backend/.env` dengan nilai acak minimal 32 karakter dan atur `ADMIN_EMAIL` serta `ADMIN_PASSWORD_HASH`. Buat JWT secret dengan `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`; buat hash password admin dengan `python3 -c "import getpass, bcrypt; print(bcrypt.hashpw(getpass.getpass().encode(), bcrypt.gensalt()).decode())"`. Pastikan MongoDB aktif.

### Mayar payment gateway
API tersedia di `http://localhost:8000/api`; dokumentasi interaktif tersedia di `http://localhost:8000/docs`. Login super admin ada di `http://localhost:3000/setia-creative-admin`; pemilik mengelola draft, pembayaran, masa aktif, dan publish di `http://localhost:3000/undangan-dashboard`.

1. Buat API Key **Read & Write** dari [Mayar API Keys](https://web.mayar.id/api-keys). API Key Read Only tidak dapat membuat invoice. Untuk pengujian, gunakan akun [Mayar Sandbox](https://web.mayar.io/api-keys).
2. Dari root project, jalankan `backend\.venv\Scripts\python.exe backend\configure_mayar.py` di Windows (atau `python3 backend/configure_mayar.py` di macOS/Linux). Masukkan API Key pada prompt tersembunyi, lalu pilih Production atau Sandbox. Key hanya disimpan di `backend/.env` yang diabaikan Git.
3. Restart backend. Panel `/undangan-admin` akan menampilkan status Mayar. Pengguna memasukkan nomor ponsel saat membuat invoice.
4. Atur Webhook URL di Mayar ke `https://<domain-api>/api/payments/mayar/webhook` dan aktifkan event `payment.received`. Endpoint memverifikasi status dan nominal dengan membaca invoice kembali dari Mayar API sebelum mengaktifkan undangan. Untuk pengembangan lokal, gunakan HTTPS tunnel yang dapat dijangkau Mayar.

Integrasi menggunakan Mayar Headless API V2 (`/hl/v2`); dokumentasi resmi: [Create Invoice](https://docs.mayar.id/api-reference-v2/invoice/create) dan [Webhook](https://docs.mayar.id/integration/webhook). Cabut dan buat ulang API Key yang sudah terlanjur dibagikan. Jangan kirim API Key ke chat, commit, atau frontend.

API tersedia di `http://localhost:8000/api`; dokumentasi interaktif tersedia di `http://localhost:8000/docs`. Pada setup lokal saat ini, aplikasi tersedia di `http://localhost:3003`; login admin ada di `/undangan-admin`, sedangkan pemilik mengelola draft, pembayaran, masa aktif, dan publish di `/undangan-dashboard`.

Invoice Mayar dibayar di halaman checkout Mayar; metode pembayaran mengikuti konfigurasi kanal pada akun Mayar. Metode rekening manual dapat ditambahkan dari panel admin dan harus diverifikasi admin setelah referensi transfer dikirim.

### Cara berbagi sesuai paket

Alur berbagi hanya tersedia untuk undangan aktif yang sudah dipublikasikan. Basic mengirim ke satu nomor WhatsApp per kali dengan nama penerima yang diisi sebelum membuka chat. Premium dan Business dapat mengunduh template Excel `.xlsx` dengan kolom `nomor_hp` dan `nama_penerima`, mengunggah daftar, atau menempelkan satu penerima per baris dengan format `nomor_hp | nama_penerima`; file maksimal 1 MB, nama wajib diisi, dan pasangan nomor/nama duplikat otomatis digabung. Setiap penerima memperoleh tiket barcode QR unik yang dibuat backend, tautan undangan personal, dan sapaan nama penerima pada sampul undangan sebelum dibuka. Pemilik dapat membuka RSVP & Buku Tamu dari dashboard dan memakai tombol scan kamera untuk check-in. Hasil check-in dicatat sebagai kehadiran di buku tamu dan tiket yang sama tidak dapat dipakai dua kali. Akses kamera di situs produksi memerlukan HTTPS; localhost juga didukung. Kedua paket memakai antrean WhatsApp berurutan. Setelah mengirim pesan di WhatsApp, pemilik kembali ke dashboard dan menekan **Sudah terkirim, lanjut** untuk membuka chat berikutnya. WhatsApp Click-to-Chat tidak memberi situs konfirmasi pengiriman, sehingga pengiriman otomatis tanpa tindakan pemilik memerlukan WhatsApp Business Cloud API. Nomor lokal Indonesia seperti `081234567890` otomatis dinormalisasi ke kode negara `62`. Fitur ini memakai Click to Chat dan tidak memerlukan API Key/backend khusus.

Nilai paket awal adalah contoh yang bisa disesuaikan: Basic 30 hari, 1 undangan, link otomatis; Premium 365 hari, 3 undangan, link pilihan; Business 365 hari, hingga 100 undangan, link pilihan. Admin dapat mengubah harga, masa aktif, kuota, hak link, metode pembayaran, konten, dan status aktif. Untuk menerima pembayaran, lengkapi API Key Mayar Read & Write dan URL webhook publik; tanpa MongoDB, JWT secret, dan konfigurasi Mayar, alur transaksi belum aktif.
