# railway-xhttp-relay

یک relay سبک برای ترافیک **XHTTP** روی Railway — مناسب برای Xray/V2Ray.

## ساختار پروژه

```
.
├── src/
│   └── server.js      ← سرور Express (relay اصلی)
├── package.json
├── railway.toml       ← تنظیمات Railway
├── .env.example
└── README.md
```

## نحوه دیپلوی روی Railway

### ۱. ایجاد پروژه جدید در Railway

از [railway.app](https://railway.app) وارد شو و یه پروژه جدید بساز.

### ۲. متغیر محیطی

در Railway Dashboard → پروژه‌ات → **Variables** این رو اضافه کن:

| نام | مثال | توضیح |
|-----|------|-------|
| `TARGET_DOMAIN` | `https://xray.example.com:2096` | آدرس کامل سرور Xray شما |

### ۳. دیپلوی

```bash
# نصب Railway CLI
npm i -g @railway/cli

# لاگین
railway login

# دیپلوی
railway up
```

یا مستقیم از GitHub repo در Railway dashboard.

---

## تنظیم کلاینت (VLESS + XHTTP)

آدرس Railway پروژه‌ات رو به جای Vercel بذار:

```json
{
  "protocol": "vless",
  "settings": {
    "vnext": [{
      "address": "your-app.railway.app",
      "port": 443,
      "users": [{ "id": "YOUR-UUID", "encryption": "none" }]
    }]
  },
  "streamSettings": {
    "network": "xhttp",
    "security": "tls",
    "tlsSettings": {
      "serverName": "your-app.railway.app",
      "allowInsecure": false
    },
    "xhttpSettings": {
      "path": "/yourpath",
      "host": "your-app.railway.app",
      "mode": "auto"
    }
  }
}
```

## Health Check

```
GET https://your-app.railway.app/__health
```

پاسخ:
```json
{ "status": "ok", "target": "https://xray.example.com:2096" }
```

## محدودیت‌ها

- **فقط XHTTP** — WebSocket و gRPC پشتیبانی نمی‌شن
- پهنای باند از quota Railway کم می‌شه
