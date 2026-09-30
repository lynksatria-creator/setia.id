# 🔐 SSL/HTTPS Certificate Issue - Fix Guide

## Problem
```
ERR_SSL_VERSION_OR_CIPHER_MISMATCH
gibrig.entertainment.com uses an unsupported protocol.
```

## Root Cause
Domain sudah pointing ke GitHub Pages, tapi HTTPS certificate belum issue atau belum properly configured.

---

## ✅ SOLUTION - Langkah per Langkah

### Step 1: Verify GitHub Pages DNS Configuration

Buka: https://github.com/satria-it/websitegibrig/settings/pages

**Pastikan terlihat:**
```
✅ Domain: gibrig.entertainment.com
✅ DNS records configured correctly
🟡 SSL certificate: Pending (atau status lain)
```

### Step 2: Check DNS Propagation

Buka: https://dnschecker.org

Masukkan: `gibrig.entertainment.com`

**Harus terlihat:**
```
CNAME: gibrig.entertainment.com → satria-it.github.io
atau
A Records pointing ke GitHub IPs
```

Jika belum, tunggu **24 jam** untuk DNS propagation.

### Step 3: Remove & Re-add Custom Domain

1. Buka: https://github.com/satria-it/websitegibrig/settings/pages
2. Hapus custom domain: `gibrig.entertainment.com`
3. Klik "Save"
4. Tunggu 2 menit
5. Tambah custom domain lagi: `gibrig.entertainment.com`
6. Check "Enforce HTTPS"
7. Klik "Save"

GitHub akan **auto-request SSL certificate** dari Let's Encrypt.

### Step 4: Wait for SSL Certificate

Waktu yang dibutuhkan:
- DNS propagation: **5 menit - 24 jam**
- SSL certificate issue: **2-3 menit** setelah DNS verified
- Total: **5 menit - 24 jam**

Monitor status di: https://github.com/satria-it/websitegibrig/settings/pages

Tunggu sampai:
```
✅ SSL certificate: Active
🟢 Domain verified
```

### Step 5: Verify DNS Records at Domain Provider

Login ke domain provider (tempat Anda beli domain `entertainment.com`):

#### Option A: CNAME Method (Recommended)
```
Subdomain: gibrig
Record Type: CNAME
Value: satria-it.github.io
TTL: 3600
```

#### Option B: A Records Method
```
Subdomain: gibrig
Record Type: A
Values:
  - 185.199.108.153
  - 185.199.109.153
  - 185.199.110.153
  - 185.199.111.153
TTL: 3600
```

> ⚠️ **IMPORTANT**: Jangan gunakan CNAME dan A records bersamaan!

### Step 6: Clear Browser Cache

```bash
# Option 1: Hard refresh browser
Ctrl + Shift + Delete  # Open DevTools → Network tab
Check: "Disable cache"
Reload page

# Option 2: Clear all cache
Chrome: Menu → Settings → Privacy → Clear browsing data
Firefox: Menu → Preferences → Privacy → Clear Data
```

### Step 7: Test HTTPS Connection

```bash
# Terminal command
curl -I https://gibrig.entertainment.com
```

**Expected output:**
```
HTTP/2 200
X-GitHub-Pages-Health-Check: Syntactic valid
Server: GitHub.com
```

---

## 🔍 Troubleshooting

### Issue: DNS tidak terupdate
**Solution:**
- Tunggu 24 jam untuk DNS propagation
- Verify di: https://dnschecker.org
- Cek domain provider settings

### Issue: SSL certificate masih pending
**Solution:**
1. Pastikan DNS sudah propagate (lihat dnschecker.org)
2. Remove & re-add custom domain di GitHub
3. Tunggu 2-3 menit untuk SSL issuance

### Issue: Still getting ERR_SSL_VERSION_OR_CIPHER_MISMATCH
**Solution:**
1. Pastikan Enforce HTTPS dicheck ✅
2. Test dengan device/browser lain
3. Clear all browser cache
4. Tunggu 24 jam jika baru setup domain

### Issue: DNS pointing tapi masih error
**Solution:**
```bash
# Check DNS resolution
nslookup gibrig.entertainment.com
dig gibrig.entertainment.com

# Output harus menunjuk ke:
satria-it.github.io
atau
GitHub IP addresses
```

---

## 📋 Checklist DNS & SSL Setup

- [ ] Domain purchased (entertainment.com)
- [ ] Subdomain created (gibrig)
- [ ] DNS records added (CNAME atau A records)
- [ ] GitHub Pages custom domain configured
- [ ] DNS propagation verified (dnschecker.org)
- [ ] GitHub SSL certificate active (green checkmark)
- [ ] Enforce HTTPS enabled ✅
- [ ] Browser cache cleared
- [ ] HTTPS working (🔒 icon visible)

---

## 🚀 Once HTTPS is Working

1. Test website: https://gibrig.entertainment.com
2. Check GitHub Pages status: https://github.com/satria-it/websitegibrig/settings/pages
3. Monitor Actions: https://github.com/satria-it/websitegibrig/actions
4. View deployment: https://github.com/satria-it/websitegibrig/deployments

---

## ❓ Still Have Issues?

### Common Questions:

**Q: Berapa lama biasanya SSL certificate terissue?**
A: 2-3 menit setelah DNS verified. Jika lebih dari 1 jam, remove & re-add domain.

**Q: Apakah perlu custom SSL certificate?**
A: Tidak, GitHub Pages menyediakan gratis via Let's Encrypt.

**Q: Bisa ganti DNS records saat sudah live?**
A: Ya, tapi hati-hati jangan sampai pointing kesalah tempat.

**Q: Kenapa masih error setelah 24 jam?**
A: Kemungkinan DNS record masih salah, cek kembali di domain provider.

---

## 📞 Contact Domain Provider Support

Jika sudah follow semua langkah di atas dan masih error:

Contact support domain provider Anda:
- **Namecheap**: https://www.namecheap.com/support/
- **GoDaddy**: https://www.godaddy.com/help
- **CloudFlare**: https://support.cloudflare.com

Tanyakan:
```
"Apakah CNAME record untuk subdomain gibrig → satria-it.github.io 
sudah active dan tidak ada conflict dengan record lain?"
```

---

**Next Step**: Setelah SSL working, baca SETUP_CHECKLIST.md untuk langkah deployment selanjutnya.

🎉 Good luck!
