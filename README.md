# Work2U WhatsApp Service

Real WhatsApp Web integration for Work2U CRM using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).

## What is this?

A standalone Node.js service that runs WhatsApp Web in a headless browser, generates a QR code for authentication, and exposes a REST API for the Work2U CRM dashboard to:
- Get QR code for pairing
- Send text messages
- Send media (images, videos, documents)
- Fetch message history
- List and create groups
- Receive incoming messages via webhook

## Setup

### 1. Install dependencies
```bash
cd whatsapp-service
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
nano .env
```

Required:
- `API_KEY` — generate with `openssl rand -hex 32`
- `WEBHOOK_URL` — your Work2U CRM webhook URL
- `WEBHOOK_SECRET` — match this with your dashboard

### 3. Run
```bash
npm start
```

You'll see:
```
🚀 Work2U WhatsApp Service running on port 3000
🔑 API Key: configured
📡 Webhook: https://crm.work2u.io/api/whatsapp/webhook
```

### 4. Pair WhatsApp
1. Open Work2U CRM → WhatsApp module
2. Enter service URL and API key
3. Service generates QR code
4. Open WhatsApp on phone → Settings → Linked Devices → Link a Device
5. Scan QR
6. Status changes to "Connected"

## API Endpoints

All endpoints require `Authorization: Bearer YOUR_API_KEY` header (except `/health`).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/status` | Get connection status |
| GET | `/api/qr` | Get QR code as data URL |
| POST | `/api/messages/send` | Send text message `{phone, message}` |
| POST | `/api/messages/send-bulk` | Bulk send `{phones[], message}` |
| POST | `/api/messages/send-media` | Send media `{phone, mediaUrl, caption}` |
| GET | `/api/messages?phone=X&limit=30` | Fetch message history |
| POST | `/api/disconnect` | Logout WhatsApp |
| POST | `/api/restart` | Restart service |

## Webhooks

When a message is received, the service POSTs to your `WEBHOOK_URL`:
```json
{
  "event": "message_received",
  "data": {
    "id": "...",
    "from": "60123456789@c.us",
    "to": "...",
    "body": "Hello!",
    "timestamp": 1234567890,
    "type": "chat",
    "fromMe": false
  },
  "secret": "your_webhook_secret"
}
```

Verify `secret` matches your `.env` `WEBHOOK_SECRET`.

## Deployment Options

### Railway (Recommended - Free tier available)
1. Push code to GitHub
2. Connect to [Railway](https://railway.app)
3. Add environment variables
4. Deploy

### Render (Free tier)
1. Push to GitHub
2. New Web Service on Render
3. Build: `npm install`
4. Start: `npm start`

### VPS (DigitalOcean, Linode, AWS)
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone & setup
git clone <your-repo>
cd whatsapp-service
npm install
cp .env.example .env
nano .env

# Use PM2 for persistence
sudo npm install -g pm2
pm2 start src/server.js --name whatsapp
pm2 save
pm2 startup
```

## Features

- ✅ QR Pairing — no Meta App needed
- ✅ Multi-device — WhatsApp Web protocol
- ✅ MIT licensed — fully open source (Baileys)
- ✅ Bearer auth — secure API access
- ✅ Webhook events — push incoming messages to CRM
- ✅ Rate limiting — protects from WhatsApp ban (30 msg/min)
- ✅ Auto-reconnect — survives network drops
- ✅ Media support — image/video/documents

## Important Notes

⚠️ **This uses unofficial WhatsApp Web protocol** (Baileys library). WhatsApp could ban numbers that violate their ToS. Use responsibly.

⚠️ **One WhatsApp number per service instance.** Multiple numbers require multiple deployments.

⚠️ **Session storage** is in `./auth` folder. Back this up to keep your session across restarts.

⚠️ **Rate limits**: Default 30 messages/minute per recipient. Exceeding triggers 429 response.

⚠️ **End-to-end encryption**: Not guaranteed with unofficial clients.

## Troubleshooting

**QR code not generating?**
- Check `/api/qr` endpoint
- Look at server logs for errors
- Make sure Chromium dependencies installed (Baileys uses Puppeteer)

**Messages not sending?**
- Verify WhatsApp is authenticated (`/api/status`)
- Check phone format: include country code, no spaces
- Check rate limit headers in response

**Service keeps restarting?**
- Usually memory issue. Puppeteer uses ~500MB.
- On 512MB VPS, add swap file or upgrade.

## License

MIT — same as whatsapp-web.js library