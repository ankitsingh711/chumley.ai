# Cloudflare Supplier Email Worker

This Worker receives inbound email from Cloudflare Email Routing and forwards it to:

`POST /api/suppliers/messages/inbound/email-reply`

on your backend.

## 1) Prerequisites

- Cloudflare-managed domain.
- Existing backend endpoint publicly reachable over HTTPS.
- Backend env configured:
  - `SUPPLIER_INBOUND_REPLY_DOMAIN`
  - `SUPPLIER_INBOUND_REPLY_PREFIX`
  - `SUPPLIER_INBOUND_WEBHOOK_SECRET`

## 2) Install and deploy Worker

```bash
cd backend/cloudflare-email-worker
npm install
npx wrangler login
npx wrangler secret put SUPPLIER_INBOUND_WEBHOOK_URL
npx wrangler secret put SUPPLIER_INBOUND_WEBHOOK_SECRET
npx wrangler deploy
```

For `SUPPLIER_INBOUND_WEBHOOK_URL`, use your full API URL, for example:

`https://api.example.com/api/suppliers/messages/inbound/email-reply`

For `SUPPLIER_INBOUND_WEBHOOK_SECRET`, use the same value as backend `SUPPLIER_INBOUND_WEBHOOK_SECRET`.

## 3) Enable Email Routing and attach Worker

1. Cloudflare Dashboard -> your domain -> **Email** -> **Email Routing** -> **Get started**.
2. Add destination mailbox (your own mailbox) and verify it. Cloudflare requires one destination.
3. Add/confirm the MX records Cloudflare asks for.
4. In **Email Routing** -> **Routing rules** -> **Create address** (or **Catch-all**).
5. For address pattern, use one that matches your reply aliases:
   - Domain mode: `supplier-reply+*@replies.example.com`
   - Mailbox mode: `inbox+supplier-reply+*@replies.example.com`
6. Action: **Send to Worker**.
7. Select this deployed worker: `supplier-email-worker`.

## 4) Configure backend reply domain

If you route replies on `replies.example.com`:

```env
SUPPLIER_INBOUND_REPLY_DOMAIN=replies.example.com
SUPPLIER_INBOUND_REPLY_PREFIX=supplier-reply
```

If you use mailbox-style aliasing:

```env
SUPPLIER_INBOUND_REPLY_DOMAIN=inbox@replies.example.com
SUPPLIER_INBOUND_REPLY_PREFIX=supplier-reply
```

## 5) Local test

1. Copy `.dev.vars.example` to `.dev.vars` and fill values.
2. Run:

```bash
npx wrangler dev
```

3. Health check:

```bash
curl http://127.0.0.1:8787/health
```

## 6) Production verification

1. Send a supplier email from your app.
2. Supplier clicks Reply from any client (Gmail/Outlook/Apple Mail/etc.).
3. Verify:
   - Worker logs with `npx wrangler tail`.
   - Backend receives `201` at `/api/suppliers/messages/inbound/email-reply`.
   - Message appears in supplier thread in UI.
