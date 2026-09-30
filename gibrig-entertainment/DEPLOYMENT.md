# 🚀 Deployment Guide - Gibrig

## Automatic Deployment (GitHub Actions)

Website akan **otomatis deploy** ke GitHub Pages setiap kali ada push ke branch `main`.

### Fitur Otomatis:
✅ Build React app dengan `yarn`  
✅ Optimize untuk production  
✅ Deploy ke `https://gibrig.entertainment.com`  
✅ Setup custom domain

### Status Deploy:
Lihat di: https://github.com/satria-it/websitegibrig/actions

---

## Manual Deployment (Jika Diperlukan)

### Lokal Build & Test:

```bash
# Navigate ke frontend
cd frontend

# Install dependencies
yarn install

# Build untuk production
yarn build

# Test build
npx serve -s build
# Buka http://localhost:3000
```

### Deploy Manual ke GitHub Pages:

```bash
# Menggunakan gh-pages package (optional)
npm install --save-dev gh-pages

# Add to package.json scripts:
# "deploy": "yarn build && gh-pages -d build"

yarn deploy
```

---

## Environment Variables

### Production (`.env.production`)
```
REACT_APP_API_URL=https://gibrig.entertainment.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
```

### Development (`.env.development`)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

---

## Pre-Deployment Checklist

- [ ] Semua test lokal sudah pass (`yarn test`)
- [ ] Build lokal berhasil (`yarn build`)
- [ ] Tidak ada console errors di browser
- [ ] Environment variables sudah dikonfigurasi
- [ ] Backend API ready di `https://gibrig.entertainment.com/api`
- [ ] CNAME file sudah ada dan benar

---

## Repository Settings (GitHub Pages)

Sudah dikonfigurasi:
✅ **Source**: Deploy from a branch  
✅ **Branch**: `main` / `root`  
✅ **Custom Domain**: `gibrig.entertainment.com` (CNAME)  
✅ **HTTPS**: Enforced

### Jika belum setup:

1. Go to: https://github.com/satria-it/websitegibrig/settings/pages
2. Set Source → "Deploy from a branch"
3. Branch → `main`, folder → `root`
4. Custom domain → `gibrig.entertainment.com`
5. Check "Enforce HTTPS"

---

## Troubleshooting

### Build Gagal?
```bash
# Clear cache & reinstall
rm -rf frontend/node_modules frontend/yarn.lock
cd frontend && yarn install
```

### Domain tidak resolve?
- Cek DNS settings (CNAME pointing ke `satria-it.github.io`)
- Tunggu propagasi DNS (bisa 24 jam)

### Page blank/404?
- Check GitHub Actions log untuk error
- Pastikan `build` folder ter-upload dengan benar

---

## Backend Deployment

Untuk backend Python, configure di tempat lain (Railway, Heroku, VPS, etc.)

Update `REACT_APP_API_URL` di GitHub Actions workflow ketika backend live.

---

**Deployment selesai! 🎉**

Website live di: **https://gibrig.entertainment.com**
