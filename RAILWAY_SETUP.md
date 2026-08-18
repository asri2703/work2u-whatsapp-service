# 🚂 Setup Railway untuk Work2U WhatsApp Service

Panduan lengkap untuk deploy WhatsApp service ke Railway.app (free tier).

## Step 1: Push Code ke GitHub

### A. Buat GitHub Repo Baru

1. Open https://github.com/new
2. Repository name: `work2u-whatsapp-service`
3. Visibility: **Private** (recommended) atau Public
4. **JANGAN** check "Add README" — kita push manual
5. Click **Create repository**

### B. Push Code dari Local

Saya akan push file untuk Abang. Run command ni dalam chat nanti:

```bash
cd /home/ubuntu/work2u/whatsapp-service
git init
git add .
git commit -m "Initial WhatsApp service"
git branch -M main
git remote add origin https://github.com/yourusername/work2u-whatsapp-service.git
git push -u origin main
```

**Note**: Abang kena ganti `yourusername` dengan GitHub username Abang.

Atau jika Abang ada **GitHub Personal Access Token (PAT)**, bagi kat saya, saya push sendiri.

---

## Step 2: Setup Railway Account

### A. Sign Up

1. Open https://railway.app
2. Click **Login** → **Sign in with GitHub**
3. Authorize Railway untuk access GitHub
4. Verify email jika diminta

### B. Create New Project

1. Click **+ New Project**
2. Pilih **Deploy from GitHub repo**
3. Find & select `work2u-whatsapp-service`
4. Click **Deploy Now**

Railway akan auto-detect Node.js dan start building.

---

## Step 3: Configure Environment Variables

### A. Open Variables Tab

1. Click pada service card (work2u-whatsapp-service)
2. Click tab **Variables** (icon gear/settings)

### B. Add These Variables

Click **+ New Variable** untuk each:

| Variable | Value | Required |
|----------|-------|----------|
| `API_KEY` | `work2u_secure_Abang_random_key_2026` | ✅ Yes |
| `WEBHOOK_URL` | `https://crm.work2u.io/api/whatsapp/webhook` | ✅ Yes |
| `WEBHOOK_SECRET` | `work2u_webhook_Abang_secret` | ✅ Yes |
| `PORT` | `3000` | Optional (auto) |

**Tips untuk generate random secret**:
```bash
# Run dalam terminal
openssl rand -hex 32
```

Copy output tu dan paste sebagai `API_KEY` atau `WEBHOOK_SECRET`.

### C. Example Values (Jangan Guna Ni - Guna Sendiri!)

```
API_KEY=work2u_aB7x9KpL2mN8qR4t
WEBHOOK_URL=https://crm.work2u.io/api/whatsapp/webhook
WEBHOOK_SECRET=work2u_wX5y8Zn3M6qL1kP9
```

⚠️ **Jangan share value sebenar dengan orang lain!**

---

## Step 4: Add Persistent Storage (Penting!)

WhatsApp session perlu storage yang **persistent**. Tanpa ni, WhatsApp akan disconnect setiap kali Railway restart.

### A. Add Volume

1. Click pada service card
2. Click tab **Settings**
3. Scroll ke **Volumes**
4. Click **+ New Volume**
5. Mount path: `/app/auth`
6. Size: `1 GB` (free tier ada 1GB)
7. Click **Add**

### B. Verify

Pergi ke **Deployments** tab → click latest deployment → check logs:

```
[INFO] Work2U WhatsApp Service on port 3000
```

Kalau ada, success! 🎉

---

## Step 5: Get Your Public URL

1. Click tab **Settings**
2. Scroll ke **Networking** section
3. Click **Generate Domain** (jika belum ada)
4. Railway akan bagi URL macam: `work2u-whatsapp-production.up.railway.app`

**Save URL ni — kita akan guna dalam dashboard!**

---

## Step 6: Test Service

### A. Health Check

Buka browser, pergi ke:
```
https://your-app.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "uptime": 123,
  "sessions": []
}
```

### B. List Sessions (Test Auth)

```bash
curl https://your-app.up.railway.app/api/sessions \
  -H "Authorization: Bearer your_api_key"
```

Should return:
```json
{
  "sessions": [],
  "total": 0
}
```

Kalau dapat 401, check API_KEY dah betul.

---

## Step 7: Connect Dashboard

### A. Open Dashboard

1. Pergi ke `https://crm.work2u.io/dashboard`
2. Click **WhatsApp** dalam sidebar
3. Masukkan:
   - **Service URL**: URL dari Railway (Step 5)
   - **API Key**: Yang Abang set dalam Variables (Step 3)
4. Click **Save & Continue**

### B. Generate QR

1. Service akan auto-call `/api/sessions/{wsId}/qr`
2. QR code akan muncul dalam dashboard
3. Open WhatsApp phone → Settings → Linked Devices → Link a Device
4. Scan QR
5. Status tukar jadi "Connected" ✓

---

## Step 8: Monitor & Maintain

### A. View Logs

1. Click service card dalam Railway
2. Click tab **Logs** atau **Deployments** → click deployment → **View Logs**
3. Akan nampak messages seperti:
```
QR received for ws-123
Authenticated ws-123
Ready ws-123
```

### B. Restart Service

Kalau ada masalah:
1. Click tab **Deployments**
2. Click **Restart** pada latest deployment

### C. Update Code

Kalau nak update code:
```bash
# Make changes, then
git add .
git commit -m "Update feature"
git push
```

Railway akan auto-detect push dan redeploy.

---

## 🔒 Security Checklist

- ✅ API_KEY unique & panjang (min 32 chars)
- ✅ WEBHOOK_SECRET match antara service & dashboard
- ✅ Volume mounted untuk session storage
- ✅ Jangan commit `.env` file ke GitHub
- ✅ Railway env vars encrypted at rest
- ⚠️ WhatsApp session stored in volume — backup periodically

---

## 🆘 Common Issues

### "Application failed to respond"
- Check env variables set correctly
- View logs untuk error messages
- Restart deployment

### "Volume mount error"
- Make sure volume path `/app/auth` betul
- Railway auto-detect kalau salah

### "QR not generating"
- Volume mungkin tak attached
- Restart service untuk reset
- Check Puppeteer dependencies installed

### "Session lost after restart"
- Volume not mounted properly
- Check Settings → Volumes → mount path correct

---

## 💰 Free Tier Limits

Railway free tier gives:
- **$5 credit per month**
- **512 MB RAM**
- **1 GB volume storage**
- **100 GB outbound bandwidth**

WhatsApp service guna ~300-500 MB RAM (Puppeteer/Chromium). So basically free, tapi Abang kena add credit card untuk verification (no charge if under limit).

---

## 📝 Quick Reference

| What | Where |
|------|-------|
| Railway dashboard | https://railway.app/dashboard |
| Railway docs | https://docs.railway.app |
| Service URL | Settings → Networking → Domain |
| API_KEY | Variables tab |
| Logs | Logs tab atau per-deployment |
| Restart | Deployments → click → Restart |

---

**Once deployed, bagi tahu saya URL & API_KEY, saya configure dashboard! 💕**