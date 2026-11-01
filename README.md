# setia.id

Platform undangan digital yang dibangun dengan React dan Vite.

## Portal.id

Beranda `/` mengikuti referensi Portal.id: header ringkas, hero wedding dua kolom, tiga kartu website partner mendatar, testimoni dan rating terpublikasi dari Portal.id serta partner, dan footer ungu. Pengunjung memberi rating website dengan memilih satu hingga lima bintang; rating dikirim dan dibaca melalui API sesuai situs, sehingga rating yang disetujui tersedia di Portal.id dan halaman partner terkait. Halaman partner juga dapat menerima rating melalui API yang sama. Halaman `/beriklan` dan `/kontak` menyediakan informasi promosi dan kanal kontak langsung; `/faq` berisi jawaban atas pertanyaan umum. Partner default adalah Nunuy Nadhifa Wedding, Musik.id, dan Undangan Digital; tautannya membuka tab baru dan dapat diubah di panel.

Jika frontend Portal.id dan website partner dipasang pada domain terpisah, arahkan `VITE_API_BASE_URL` semuanya ke backend API yang sama dan masukkan setiap domain frontend ke `CORS_ORIGINS` backend agar rating tetap tersinkron.

## Musik.id — Gibrig Entertainment

Halaman `/gibrig` mempertahankan landing page lengkap sesuai referensi, dengan lima halaman terpisah: `/gibrig/tentang`, `/gibrig/entertainment`, `/gibrig/paket`, `/gibrig/galeri`, dan `/gibrig/testimoni`. Navigasi enam halaman tersedia di header dan footer. Semua data artis, paket, gambar, galeri, kontak, dan testimoni tetap berasal dari konfigurasi CMS yang ada; tombol paket mengirim pertanyaan paket yang dipilih melalui WhatsApp.

## Nunuy Nadhifa Wedding

Halaman `/nunuy-nadhifa-wedding` memakai tema Luxury Lilac dan menampilkan layanan, paket Silver/Gold/Platinum, galeri yang dapat difilter, testimoni terverifikasi, inspirasi, FAQ, serta konsultasi WhatsApp. Setiap layanan dan artikel memiliki halaman detail sendiri; metadata SEO dan sitemap mencakup halaman bawaan. Harga, jumlah kru, durasi, dokumentasi, profil tim, dan testimoni dapat diubah admin; data yang belum dikonfirmasi tidak diisi dengan klaim atau testimoni contoh.

Panel `/nunuy-admin` dilindungi login super admin. Editor mendukung CRUD data situs dan gambar WebP, sementara permintaan konsultasi dikirim ke API/MongoDB dan dapat ditindaklanjuti atau ditutup dari panel. Untuk domain deployment, konfigurasi `MONGO_URL`, `DB_NAME`, `VITE_API_BASE_URL`, serta `CORS_ORIGINS` backend/frontend harus menunjuk ke layanan yang sama. Konten situs saat ini tetap disimpan di `localStorage` browser; gunakan ekspor/impor konfigurasi admin untuk cadangan atau pemindahan perangkat.

Panel `/admin` (alias `/portal-admin`) menyediakan pengelolaan partner: tambah, edit kategori/nama/deskripsi/gambar/URL, ubah urutan, aktifkan, atau hapus. Panel juga mengatur hero, banner promosi, kontak WhatsApp, tautan sosial, slot iklan, gambar WebP, dan tema. Pengaturan SEO semua website dipusatkan di `/setia-creative-admin/seo`; konfigurasi SEO disimpan di MongoDB dan diterapkan ke metadata halaman publik.

Sitemap tersedia di `/sitemap.xml`, dan robots crawler mengarah ke sitemap domain `portal.id`.

Admin Portal lokal: `admin` / `admin123`.

## Menjalankan aplikasi

```sh
npm install
npm start
```

Buka http://localhost:3000 untuk melihat aplikasi.

## Panel super admin

Masuk sekali melalui `/setia-creative-admin` menggunakan akun admin backend (`ADMIN_EMAIL` dan `ADMIN_PASSWORD_HASH` pada `backend/.env`). URL khusus admin tidak ditampilkan di navigasi website publik. Panel konten website tersedia di `/portal-admin`, `/gibrig-admin`, `/nunuy-admin`, dan `/undangan-website-admin`; panel paket dan pembayaran Nuansa Invite tersedia di `/undangan-admin`. Setelah login super admin, semua link panel dapat dibuka tanpa login ulang; sesi bersama disimpan selama tab browser aktif.

Dashboard SEO Super Admin di `/setia-creative-admin/seo` mengelola title, description, frasa pencarian, canonical URL, gambar Open Graph, dan kebijakan indeks untuk Portal.id, Gibrig Entertainment/Musik.id, Nunuy Nadhifa Wedding, serta Nuansa Invite. Pemeriksaan panjang judul/deskripsi adalah panduan, bukan jaminan peringkat; Google tidak memakai meta keywords sebagai faktor ranking. Halaman tetap membutuhkan konten yang relevan dan sitemap domain yang benar. Metadata SPA diperbarui di browser, sehingga untuk pratinjau sosial crawler non-JavaScript diperlukan rendering server-side/prerender.

Setiap panel website menyediakan editor untuk semua nilai konten, logo, gambar hero, warna, font, ukuran, nomor HP, dan WhatsApp, serta 100 template desain original per website. Template publik Nuansa Invite dapat difilter melalui tombol kategori; kategori tanpa template aktif tidak ditampilkan. Setiap website memiliki nomor kontak sendiri; tombol WhatsApp publik memakai nomor dan pesan pembuka yang diatur di panel website terkait. Perubahan konten dan gambar disimpan di `localStorage` browser yang dipakai; gunakan browser/perangkat yang sama untuk melihat perubahan tersebut. Website Gibrig, Nunuy, dan Nuansa Invite memiliki menu Beranda yang menuju Portal Iklan.

Dashboard pembuat undangan menyediakan desain inspirasi untuk seluruh 38 provinsi, katalog musik instrumental orisinal berdasarkan genre, tautan musik eksternal, serta upload musik (maksimal 8 MB) dan video MP4/WebM/Ogg (maksimal 4 MB). Video YouTube/Vimeo dan tautan video langsung juga didukung. Basic memperoleh slug otomatis; Premium dan Business memperoleh slug otomatis yang dapat diedit. Setiap undangan memiliki tautan RSVP otomatis ke bagian konfirmasi kehadiran (`/i/<slug>#rsvp`). Pemilik dapat menyalin tautan RSVP, membagikan undangan, dan mengunduh RSVP/buku tamu sebagai file `.xlsx`. Template website yang diterapkan di panel admin mengubah warna, tipografi, ukuran, dan layout setelah perubahan dipublikasikan. Editor undangan menyesuaikan kolom nama untuk pasangan atau nama orang/agenda yang dirayakan. Tautan WhatsApp undangan resmi dapat dipersonalisasi dengan nama calon tamu; nama tersebut tampil di sampul melalui parameter `to` pada tautan.

Setiap undangan yang sudah dipublikasikan menyediakan QR khusus pemilik. Memindai QR akan membuka dashboard pada buku tamu undangan tersebut; jika perlu, pemilik login lebih dahulu dan kemudian diarahkan kembali ke buku tamu.

Pemilik paket yang mengaktifkan fitur reseller dapat mengelola akun affiliate/reseller, dengan batas akun dan hak fitur yang dikonfigurasi Super Admin. Pemilik mengonfirmasi satu kombinasi kuota Basic/Premium; kombinasi yang dipilih dikunci permanen. Iklan yang diaktifkan reseller tampil pada halaman depan Nuansa Invite. Konfigurasi hak paket dan pembayaran tersimpan terpusat di backend MongoDB; perubahan harga, masa aktif, kuota, bulk upload, dan akses reseller berlaku untuk pesanan baru. Order pembayaran menyimpan snapshot hak paketnya agar perubahan konfigurasi tidak mengubah pembayaran yang sedang berlangsung atau paket aktif.

Super Admin Nuansa Invite juga dapat membuat akun demo dengan memilih paket dan masa akses dalam hari/jam. Akun demo dapat membuat maksimal dua undangan, tidak dapat membayar, dan login akun serta akun turunannya ditolak setelah masa demo berakhir.

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

Pendaftaran akun Undangan.id mengirim OTP enam digit ke email yang didaftarkan. OTP berlaku 10 menit, dibatasi lima percobaan, dan dapat dikirim ulang setelah 60 detik. Akun dan sesi baru dibuat hanya setelah OTP benar. Kata sandi pendaftaran minimal 8 karakter dan wajib mengandung huruf kecil, huruf besar, serta angka; simbol bersifat opsional. Form pendaftaran menampilkan indikator kekuatan kata sandi. Atur `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, dan `SMTP_FROM_EMAIL` pada `backend/.env` agar backend dapat mengirim email. Port 587 memakai STARTTLS; untuk SSL implisit seperti port 465, set `SMTP_USE_SSL=true`. `SMTP_FROM_NAME` mengatur nama pengirim.

Sebelum menjalankan server, isi `JWT_SECRET` di `backend/.env` dengan nilai acak minimal 32 karakter dan atur `ADMIN_EMAIL` serta `ADMIN_PASSWORD_HASH`. Buat JWT secret dengan `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`; buat hash password admin dengan `python3 -c "import getpass, bcrypt; print(bcrypt.hashpw(getpass.getpass().encode(), bcrypt.gensalt()).decode())"`. Pastikan MongoDB aktif dan kredensial SMTP sudah terkonfigurasi untuk mengaktifkan pendaftaran.

### Midtrans payment gateway
API tersedia di `http://localhost:8000/api`; dokumentasi interaktif tersedia di `http://localhost:8000/docs`. Login super admin ada di `http://localhost:3000/setia-creative-admin`; pemilik mengelola draft, pembayaran, masa aktif, dan publish di `http://localhost:3000/undangan-dashboard`.

1. Dari Midtrans Merchant Administration Portal (MAP), salin **Server Key** dari Settings → Access Keys. Gunakan Sandbox Server Key untuk pengujian, lalu Production Server Key saat siap menerima pembayaran nyata. Client Key bukan Server Key dan tidak cukup untuk membuat transaksi di backend.
2. Salin `backend/.env.example` menjadi `backend/.env`. Jalankan `python3 backend/configure_midtrans.py` (atau `backend\.venv\Scripts\python.exe backend\configure_midtrans.py` di Windows), masukkan **Server Key** pada prompt tersembunyi, dan pilih Sandbox atau Production. Script menyimpan key lokal ke `backend/.env` yang diabaikan Git.
3. Set `MIDTRANS_IS_SANDBOX=true` untuk Sandbox atau `false` untuk Production, lalu restart backend. Panel `/undangan-admin` menunjukkan status konfigurasi gateway. Checkout memakai Midtrans Snap dan tidak memerlukan Client Key di frontend.
4. Di MAP, buka Settings → Configuration dan atur Payment Notification URL ke `https://<domain-api>/api/payments/midtrans/webhook`. URL harus dapat dijangkau dari internet publik; untuk pengembangan lokal gunakan HTTPS tunnel. Webhook memverifikasi `signature_key`, kemudian memeriksa status transaksi dan nominal melalui Get Status API sebelum mengaktifkan undangan.

Integrasi menggunakan Snap API dan Get Status API; dokumentasi resmi: [Snap integration guide](https://docs.midtrans.com/docs/snap-snap-integration-guide), [HTTP notifications](https://docs.midtrans.com/docs/https-notification-webhooks), dan [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status). Jangan kirim Server Key ke chat, commit, atau frontend.
Sebelum cutover, tinjau dan selesaikan order Mayar lama yang masih berstatus pending; order tersebut tidak dikonfirmasi oleh webhook Midtrans.

API tersedia di `http://localhost:8000/api`; dokumentasi interaktif tersedia di `http://localhost:8000/docs`. Pada setup lokal saat ini, aplikasi tersedia di `http://localhost:3003`; login admin ada di `/undangan-admin`, sedangkan pemilik mengelola draft, pembayaran, masa aktif, dan publish di `/undangan-dashboard`.

Pembayaran diproses di halaman checkout Midtrans; metode pembayaran mengikuti konfigurasi kanal pada akun Midtrans. Metode rekening manual dapat ditambahkan dari panel admin dan harus diverifikasi admin setelah referensi transfer dikirim.

### Cara berbagi sesuai paket

Alur berbagi hanya tersedia untuk undangan aktif yang sudah dipublikasikan. Hak pengiriman satu penerima atau bulk upload, serta jumlah maksimal penerima per permintaan, mengikuti entitlement paket yang dikonfigurasi Super Admin dan ditegakkan kembali oleh backend. Paket yang mengaktifkan bulk dapat mengunduh template Excel `.xlsx` dengan kolom `nomor_hp` dan `nama_penerima`, mengunggah daftar, atau menempelkan satu penerima per baris dengan format `nomor_hp | nama_penerima`; file maksimal 1 MB, nama wajib diisi, dan pasangan nomor/nama duplikat otomatis digabung. Setiap penerima memperoleh tiket barcode QR unik yang dibuat backend, tautan undangan personal, dan sapaan nama penerima pada sampul undangan sebelum dibuka. Pemilik dapat membuka RSVP & Buku Tamu dari dashboard dan memakai tombol scan kamera untuk check-in. Hasil check-in dicatat sebagai kehadiran di buku tamu dan tiket yang sama tidak dapat dipakai dua kali. Akses kamera di situs produksi memerlukan HTTPS; localhost juga didukung. Bulk memakai antrean WhatsApp berurutan. Setelah mengirim pesan di WhatsApp, pemilik kembali ke dashboard dan menekan **Sudah terkirim, lanjut** untuk membuka chat berikutnya. WhatsApp Click-to-Chat tidak memberi situs konfirmasi pengiriman, sehingga pengiriman otomatis tanpa tindakan pemilik memerlukan WhatsApp Business Cloud API. Nomor lokal Indonesia seperti `081234567890` otomatis dinormalisasi ke kode negara `62`. Fitur ini memakai Click to Chat dan tidak memerlukan API Key/backend khusus.

Nilai harga dan masa aktif awal dapat disesuaikan Super Admin. Default kuota undangan aktif: Basic 1, Premium 5, dan Business 100. Basic tidak mengaktifkan bulk upload; Premium dan Business mengaktifkannya dengan batas awal 1.000 penerima per permintaan. Reseller aktif secara default pada Business (maksimal 100 akun), tidak aktif pada Basic/Premium, dan dapat diubah lewat panel. Super Admin dapat mengatur harga, durasi, kuota undangan aktif, status paket, batas penerima, hak bulk upload, hak reseller, batas akun reseller, metode pembayaran, dan konten fitur paket. Pesanan baru memakai konfigurasi terkini; pembayaran pending memakai nominal/durasi yang sudah dibuat, dan undangan aktif mempertahankan snapshot hak paketnya. Untuk menerima pembayaran, lengkapi Midtrans Server Key dan URL webhook publik; tanpa MongoDB, JWT secret, dan konfigurasi Midtrans, alur transaksi belum aktif.
