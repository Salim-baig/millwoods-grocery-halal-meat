# Millwoods Grocery & Halal Meat — Website

An informational + catalogue website for Millwoods Grocery & Halal Meat (Mill Woods, Edmonton, AB) —
*"Your one stop spot for fresh and frozen halal meat, South Asian groceries, and takeout. Serving the
south Edmonton community since 2002."* Pure HTML/CSS/vanilla JavaScript — no build step, no
dependencies.

The public site is **browse + visit/call** — there is **no online ordering, delivery, pickup, or
pricing** (meat prices change weekly with the market). Staff tools (Admin/POS/backend) remain
available behind a login for in-store use.

**🌐 Live demo:** https://salim-baig.github.io/millwoods-grocery-halal-meat/
(Staff area: `/admin.html` and `/pos.html` — passcode `millwoods2026`.)

## Run it

Any static server works. The simplest:

```bash
cd "Millwoods Halal Grocery and Meat"
python3 -m http.server 9000
# then open http://localhost:9000
```

Or just open `index.html` directly in a browser.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — tagline, "what we offer", featured products (no prices), store hours & directions |
| `shop.html` | Product catalogue with category filters (browse only — no prices/ordering) |
| `product.html` | Product info — photo, description, in-store barcode, call/visit (no price/cart) |
| `community.html` | **Follow us** — links to the store's social media |
| `pay.html` | **Pay online** — pay-by-amount card payment via Square (for phone/takeout/weighed-meat totals), with Interac e-Transfer + call fallback |
| `login.html` | **Staff login** — passcode gate for Admin & POS (default passcode `millwoods2026`) |
| `admin.html` | **Staff admin** (login-gated) — revenue dashboard, **incoming Orders queue** (status + new-order badge), product add/edit/hide, and payment + **email/notification** settings |
| `pos.html` | **Counter POS** — scan barcode, enter quantity/weight, build a bill, complete in-store sale (recorded to revenue), **print an 80 mm thermal receipt** |
| `labels.html` | **Barcode labels** — prints on **80 mm thermal** (one label per item, default) or A4 sheet; `?id=<productId>` prints a single label. Linked from Admin → Print barcodes, and per-row "Label" |

## Editing common things

- **Store info / tagline / social links:** `STORE` in `assets/js/data.js` (address, phone, hours,
  `tagline`, `since`, and `social` — set the Facebook/Instagram URLs there; they appear in the
  footer and on the Community page).
- **Products shown in the catalogue:** the `PRODUCTS` array in `assets/js/data.js` (the public site
  shows photo, name, category, description — no price).

> Note: online ordering, delivery/pickup, catalogue pricing, recipes, the supplier/"Our Standards"
> page, the halal label badges, and prayer times were **removed** at the owner's request. The public
> storefront is browse-only, plus a **Pay Online** page (pay-by-amount).

## Online payments (Square, pay-by-amount)

`pay.html` lets a customer pay a **quoted total** by card — a fit for weekly-changing meat prices and
phone/takeout orders (no fixed catalogue prices needed). It calls the backend's
`POST /api/square/payment-link`, which creates a **Square-hosted** payment page; card details never
touch this site. Money settles to the store's **TD** account (Square deposits to any Canadian bank).

To turn it on:
1. Open a free **Square** account; set `SQUARE_ACCESS_TOKEN` + `SQUARE_LOCATION_ID` in `server/.env`
   and deploy the backend (see [server/README.md](server/README.md)).
2. If the site is hosted separately from the backend, set `BACKEND` in `pay.html` (or `mwh_api_base`
   in localStorage) to the backend URL.

Until configured, the page shows **Interac e-Transfer + call** options instead (graceful fallback).

## Project structure

```
assets/
  css/style.css     all styling
  js/data.js        products, recipes, suppliers, prayer times, delivery zones (mock data)
  js/store.js       cart + delivery-zone state (localStorage)
  js/ui.js          shared header/footer, halal badges, toasts
*.html              pages
```

## Notes for going live (next steps)

- The "zip code" was implemented as a **Canadian postal code** validator (Mill Woods FSAs:
  T6K, T6L, T6T, etc.) since that's what real Edmonton customers enter. Edit the `DELIVERY.zones`
  map in `data.js` to adjust your delivery area.
- **Delivery pricing:** flat **$5 within 5 km** of the store (9232 34 Ave NW, T6N 1C9),
  $8 for 5–10 km, and free over $100. Distance is **computed with the haversine formula**
  (`Store.checkZone` / `Store.deliveryFee` in `assets/js/store.js`) from the store's
  coordinates to each delivery FSA's centroid in `DELIVERY.zones`. For per-address precision,
  geocode the customer's full postal code and feed the lat/lng into the same haversine call.
- **Product images** live in `assets/img/<product-id>.jpg`. These are **freely-licensed stock
  photos** (sourced via Openverse / Wikimedia Commons) chosen to show **raw/fresh** product —
  raw meat, raw poultry, and uncooked ingredients — not prepared dishes. Replace each with the
  store's own product photos (same filename, no code changes needed). If an image is missing, the
  page falls back to the product emoji automatically.
- **Admin page** (`admin.html`, linked as "Staff Admin" in the footer) is a client-side back-office:
  - **Revenue** — today / this week / this month / this year / custom range, with KPI cards, a bar
    chart, and recent orders. Real orders are recorded on checkout (`Store.recordOrder`); a
    "Load sample data" button seeds ~1 year of demo orders so the charts aren't empty.
  - **Products** — add/edit/hide/delete items; edits persist in `localStorage` and the storefront
    reflects them on next load (`Store.applyCatalogEdits` mutates the global product list).
  - **Settings** — pick the payment provider and enter the **Stripe key** (and PayPal/Square keys);
    saved to `localStorage` and merged into `payments.js`. For production, put **secret** keys in
    `server/.env`, not the browser (the page warns about this).
  - It's intentionally unauthenticated for the prototype — add real staff auth before launch.
- **In-store barcodes & POS** (`assets/js/barcode.js`): every product has a stable scannable
  **Code128** barcode (`Barcode.value` — derived from the product id, or an explicit UPC set in
  Admin). Barcodes show on each product page, print as a label sheet (`labels.html`), and drive the
  **Counter POS** (`pos.html`): scan → enter quantity (unit items) or weight (per-lb meat) → bill →
  complete sale, which records an `in-store` / `Counter` order into the revenue dashboard. Barcodes
  render via JsBarcode (CDN); the POS lookup works offline. A handheld scanner just types the code
  into the focused field + Enter — no driver needed.
- **80 mm thermal printing:** `labels.html` defaults to an 80 mm roll layout (one label per item,
  `@page { size: 80mm auto }`) for sticking on stock — with an A4 fallback and `?id=` single-label
  reprint. After a POS sale, **Print receipt (80 mm)** renders an isolated thermal receipt (store
  header, line items, subtotal/GST/total, ref) into a hidden iframe and prints it — sized to a
  72 mm print body for 80 mm paper.
- **Online orders, notifications & receipts:** checkout collects the customer's name, phone, email,
  and (for delivery) full address; the completed order is recorded with a fulfilment **status** and
  shows in **Admin → Orders** (newest first, with a new-order badge and a status dropdown:
  new → preparing → ready → out → completed). Receipts to the customer and a new-order alert to the
  store are sent via **EmailJS** (`assets/js/notify.js`), configured in **Admin → Settings → Order
  emails**. ⚠️ Because this is a *static* site, `localStorage` is per-browser — the admin on another
  device only learns about an order via the **email alert** (or a backend). Without EmailJS configured
  the order is still recorded/shown; email just stays off.
- **Backend (optional, for real cross-device orders):** [`server/`](server/) is a runnable
  Express API (orders with **server-side price validation**, staff auth, email, payments) that also
  serves the site. It **can't run on GitHub Pages** (static only) — deploy it on a no-VM host. A
  [`render.yaml`](render.yaml) blueprint is included for **Render's free tier**. After deploying,
  open **Admin → Settings → Backend connection** and paste the backend URL: the storefront then
  sends orders to the server and the admin reads/updates them there (orders sync across devices).
  Leave it blank to keep the pure-static localStorage behaviour. See [server/README.md](server/README.md).
- **Prayer times** on the Community page refresh **daily** from the free
  [Aladhan API](https://aladhan.com/prayer-times-api) (ISNA method) for the store's coordinates,
  cached per-day in `localStorage`, with today's Gregorian + Hijri date and a static fallback offline.
- Replace mock data in `data.js` with a real inventory feed/CMS.
- **Real payments are scaffolded** — see [PAYMENTS.md](PAYMENTS.md). Checkout defaults to a
  simulated (`demo`) flow; set `PAYMENTS.provider` + credentials in `assets/js/payments.js` to go
  live with PayPal (no backend), or Stripe / Square (using the backend in [`server/`](server/)).
- The real in-store catalogue items (ghee, dates, cake rusk, bazoori, mango, carrom board, etc.)
  currently show emoji placeholders — drop the store's photos into `assets/img/<product-id>.jpg`
  and they appear automatically. Two prices were not provided and are placeholders to confirm:
  **Pakistani Mango ($24.99)** and **Carrom Board ($99.99)**.
- Upload real certificate PDFs and link them from `standards.html`.
