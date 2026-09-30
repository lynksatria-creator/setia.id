# 🚀 SETUP LENGKAP - Checklist Pembukaan Website

Ikuti langkah ini **secara berurutan** untuk membuat website live di `https://gibrig.entertainment.com`

---

## ✅ STEP 1: Verifikasi Repository Setup (SUDAH SELESAI)

Berikut file yang sudah dibuat:

- ✅ `DEPLOYMENT.md` - Panduan deployment
- ✅ `CONTRIBUTING.md` - Guidelines kontribusi  
- ✅ `GITHUB_ACTIONS_SETUP.md` - Setup GitHub Actions
- ✅ `frontend/.env.production` - Environment production
- ✅ `frontend/.env.development` - Environment development
- ✅ `frontend/.htaccess` - React Router config
- ✅ `frontend/public/robots.txt` - SEO robots

**Status**: ✅ Selesai

---

## ⚠️ STEP 2: Tambah File yang BELUM BISA Dibuat (Manual)

### 2.1 Buat `.github/workflows/deploy.yml`

1. Di GitHub, buka repo: https://github.com/satria-it/websitegibrig
2. Klik tombol "Add file" → "Create new file"
3. Path: `.github/workflows/deploy.yml`
4. Paste kode dari file `GITHUB_ACTIONS_SETUP.md` (bagian workflow YAML)
5. Commit with message: `ci: Add GitHub Actions deployment workflow`

### 2.2 Buat `frontend/craco.config.js`

1. Buka https://github.com/satria-it/websitegibrig
2. Klik "Add file" → "Create new file"
3. Path: `frontend/craco.config.js`
4. Paste kode dari file `GITHUB_ACTIONS_SETUP.md` (bagian craco config)
5. Commit dengan message: `feat: Add craco webpack optimization`

**Status**: ⏳ Tunggu diset manual

---

## 🔧 STEP 3: Configure GitHub Pages Settings

1. Buka: https://github.com/satria-it/websitegibrig/settings/pages

2. Pastikan sudah terisi:
   - **Source**: ✅ Deploy from a branch
   - **Branch**: ✅ `main` 
   - **Folder**: ✅ `/ (root)`

3. Custom Domain:
   - ✅ Input: `gibrig.entertainment.com`
   - ✅ Check "Enforce HTTPS"

4. Klik **Save**

**Status**: ⏳ Konfigurasi di GitHub

---

## 🌐 STEP 4: Configure DNS (Domain Settings)

Masuk ke panel domain `entertainment.com` Anda:

### Tambah DNS Records:

**A Records:**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**CNAME Record:**
```
Subdomain: gibrig
Points to: satria-it.github.io
```

> CNAME file sudah ada di repo, GitHub akan auto-verify

**Status**: ⏳ Setup di domain provider

---

## ✨ STEP 5: Trigger Build & Deploy

### Opsi A: Push ke main branch
```bash
cd websitegibrig
git add .
git commit -m "Setup complete - ready to deploy"
git push origin main
```

### Opsi B: Manual trigger via GitHub UI
1. Buka: https://github.com/satria-it/websitegibrig/actions
2. Pilih workflow: "Deploy to GitHub Pages"
3. Klik "Run workflow" → "Run workflow"

**Status**: ⏳ Trigger deployment

---

## 📊 STEP 6: Monitor Deployment Progress

1. Buka: https://github.com/satria-it/websitegibrig/actions

2. Lihat workflow berjalan:
   - 🔵 **Build** - Sedang build React app (2-3 menit)
   - 🟢 **Deploy** - Deploy ke GitHub Pages (30 detik)

3. Tunggu sampai ✅ **Both jobs completed**

**Status**: ⏳ Monitor di Actions tab

---

## 🎉 STEP 7: Verifikasi Website Live

Tunggu **5-10 menit** setelah deploy selesai, kemudian buka:

### ✅ Test URLs:

```
https://gibrig.entertainment.com
https://satria-it.github.io/websitegibrig
```

**Expected Results:**
- ✅ Page load tanpa error
- ✅ React app berjalan
- ✅ Tidak ada 404 errors
- ✅ HTTPS aktif (🔒 icon terlihat)

---

## 🐛 TROUBLESHOOTING

### Problem: Build Failed ❌

**Solution:**
1. Buka Actions log yang failed
2. Cari error message
3. Common issues:
   - Dependency conflict → jalankan `yarn install` di local
   - Build error → jalankan `yarn build` di `frontend/` folder
   - Memory → restart atau bersihkan cache

```bash
cd frontend
yarn install
yarn build
```

### Problem: Deploy Pending ⏳

**Solution:**
- GitHub Pages auto-deploy membutuhkan 5-10 menit
- DNS propagation membutuhkan 24 jam
- Cek: https://dnschecker.org untuk DNS status

### Problem: Website Still 404 ❌

**Solution:**
1. Pastikan custom domain sudah verify (green checkmark)
2. Refresh browser (Ctrl+F5)
3. Cek DNS records di domain provider
4. Tunggu DNS propagation selesai

### Problem: Build Error - ENOENT ❌

**Solution:**
```bash
# Clean install
cd frontend
rm -rf node_modules yarn.lock
yarn install
yarn build
```

---

## 📋 Final Checklist Sebelum Go-Live

- [ ] File `.github/workflows/deploy.yml` dibuat ✅
- [ ] File `frontend/craco.config.js` dibuat ✅
- [ ] GitHub Pages settings sudah dikonfigurasi ✅
- [ ] DNS records sudah ditambah ✅
- [ ] Build workflow berhasil dijalankan ✅
- [ ] Deploy workflow berhasil dijalankan ✅
- [ ] Website accessible di https://gibrig.entertainment.com ✅
- [ ] HTTPS aktif (🔒) ✅
- [ ] React app berfungsi dengan baik ✅

---

## 🎊 Selesai!

Website Anda sekarang LIVE! 

### Link Penting:
- 🌐 Website: https://gibrig.entertainment.com
- 📊 GitHub Actions: https://github.com/satria-it/websitegibrig/actions
- ⚙️ Settings: https://github.com/satria-it/websitegibrig/settings/pages
- 📝 Deploy Log: https://github.com/satria-it/websitegibrig/deployments

### Next Steps:
1. Monitor website performance
2. Setup analytics (Google Analytics)
3. Configure error tracking (Sentry)
4. Backup database backend
5. Setup monitoring & alerts

---

**Questions?** Baca dokumentasi di DEPLOYMENT.md atau GITHUB_ACTIONS_SETUP.md

**Good luck!** 🚀🎉
