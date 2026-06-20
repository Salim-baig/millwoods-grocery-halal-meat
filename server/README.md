# Backend — Millwoods Grocery & Halal Meat

A single Node/Express process that serves the site **and** provides the API:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/orders` | public | Place an online order (prices recomputed server-side), save it, email receipt + store alert |
| `GET /api/orders` | staff | List all orders (for the admin) |
| `PATCH /api/orders/:ref` | staff | Update an order's status |
| `POST /api/login` | public | Exchange the staff passcode for a token |
| `POST /api/stripe/create-checkout-session` | public | Stripe Checkout with a **server-computed** amount |
| `POST /api/square/pay` | public | Square payment with a **server-computed** amount |
| `GET /api/health` | public | Status + counts |
| everything else | — | Serves the static site from the repo root |

Orders persist to `server/data/orders.json` (gitignored). Prices/fees/GST are
recomputed from `assets/js/data.js` server-side, so a tampered client can't
change the amount (fixes the audit's "client-trusted price" finding).

## Run it

```bash
cd server
npm install
cp .env.example .env      # set STAFF_PASSCODE, SERVER_SECRET, STORE_EMAIL, SMTP_*, payment keys
npm start                 # http://localhost:4242  (serves the whole site + API)
```

Quick test:
```bash
curl localhost:4242/api/health
curl -X POST localhost:4242/api/orders -H 'content-type: application/json' \
  -d '{"mode":"pickup","customer":{"name":"Test","phone":"7805551234","email":"t@e.com"},"lines":[{"id":"goat-leg","qty":2}]}'
```

## ⚠️ Hosting reality (important)

**This backend cannot run on GitHub Pages.** GitHub Pages is *static hosting only* —
it serves HTML/CSS/JS files and cannot run a Node server. GitHub does **not** offer
any product that runs an always-on web server (GitHub Actions is CI/CD, not hosting).

Good news: **you do NOT need a virtual machine.** "Serverless" platforms run code
on demand with **no VM to manage** and have free tiers:

| Option | VM to manage? | Notes |
|--------|---------------|-------|
| **Render** (free web service) | No | Easiest "just deploy this Express app" — paste the repo, set env vars |
| **Cloudflare Workers / Pages Functions** | No | Serverless, generous free tier |
| **Fly.io** | No (managed) | Tiny free allowance |
| Netlify / Vercel functions | No | Serverless (works, just not GitHub) |
| **Run locally in the store** | No cloud | Run `npm start` on the shop's computer; great for in-store POS/admin on the LAN. Online orders from the public site still need a public URL (one of the above). |

Recommended split: keep the **frontend on GitHub Pages** (free, already deployed)
and run **this backend on Render free tier** (no VM, ~5 min setup), then point the
site at it. Or host everything from this one process on Render and skip Pages.

After deploying, set the site's API base URL to your backend so the storefront
sends orders to it (frontend wiring is the next step).
