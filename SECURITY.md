# Security audit — Millwoods Grocery & Halal Meat (prototype)

Manual review of the client-side app (HTML/CSS/JS + optional payment backend in `server/`).
Date: 2026-06-20. `/security-review` couldn't run (not a git repo), so this is a manual audit.

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Stored XSS via unescaped product fields | High | ✅ Fixed |
| 2 | No auth on Admin & POS pages | High | ⚠️ Open (needs backend) |
| 3 | Client-trusted prices / payment amount | High (go-live) | ⚠️ Documented |
| 4 | Third-party CDN script without SRI | Medium | ✅ Fixed (vendored) |
| 5 | No Content-Security-Policy / security headers | Medium | ⚠️ Open (host config) |
| 6 | All state in localStorage (untrusted) | Medium | ⚠️ By design (prototype) |
| 7 | `target="_blank"` without `rel=noopener` | Low | ✅ Fixed |
| 8 | Secrets handling | Low | ✅ OK (publishable-only) |
| 9 | HTTPS required in production | Low | ⚠️ Deploy note |
| — | No `eval` / `new Function` | — | ✅ Clean |

## Findings

### 1. Stored XSS — FIXED
The app rendered product names, categories, descriptions, the "special instructions" note, and an
admin-set image URL into the DOM via `innerHTML` with **no escaping**. Because the catalog editor
(Admin) is unauthenticated (#2), an attacker could add/edit a product whose name/description/image
URL contains markup (e.g. `<img src=x onerror=…>` or an attribute-breakout image URL) and it would
execute in **every customer's browser** on the shop/product/cart pages.
**Fix:** added `UI.esc()` (HTML entity-encode) and applied it to all untrusted product fields on
index, shop, product, cart, pos, labels, and the admin table, plus the image-URL attribute in the
shared `thumbInner`. Verified: injected `<img onerror>`, `<script>`, and an attribute-breakout URL
all render as inert text and do not execute.

### 2. No authentication / authorization on Admin & POS — OPEN
`admin.html` and `pos.html` are reachable by anyone (and linked in the footer). They allow editing
the catalog & prices, changing payment provider/keys, viewing/clearing revenue, and processing
sales. There is no login.
**Remediation:** these must sit behind real **server-side authentication** before launch. As a
client-only prototype there's no secure way to gate them in the browser. Interim: remove the public
footer links and serve `admin.html`/`pos.html` behind HTTP auth / a protected path. (A browser-only
"passcode" is not real security — anyone can read the JS.)

### 3. Client-trusted pricing & payment amount — DOCUMENTED
Prices, cart totals, and the amount sent to the Stripe/Square backend are all computed in the
browser and are editable via the console / localStorage. The backend scaffold trusts the amount it
receives.
**Remediation:** look up prices and compute the total **server-side** from product IDs, and verify
it before charging. Never trust a client-supplied amount. (Also noted in `PAYMENTS.md`.)

### 4. CDN script without Subresource Integrity — FIXED
JsBarcode was loaded from a public CDN with no `integrity` hash (supply-chain risk).
**Fix:** vendored it locally to `assets/js/jsbarcode.min.js` (v3.11.6, MIT) and removed the CDN
reference. Bonus: barcodes now render offline. (Payment SDKs — PayPal/Square — still load from their
own provider domains only when a live provider is configured; that's expected.)

### 5. No Content-Security-Policy / security headers — OPEN
No CSP, `X-Frame-Options`/`frame-ancestors` (clickjacking), `X-Content-Type-Options`,
`Referrer-Policy`, or HSTS.
**Remediation:** set these at the web server / host. A CSP would blunt residual XSS — note the app
uses inline event handlers, so adopting a strict CSP means moving to event delegation or nonces.

### 6. All state in localStorage — BY DESIGN (prototype)
Cart, orders, revenue, catalog edits, and payment config live in `localStorage`, fully
user-controllable. Revenue figures and prices are therefore **not a source of truth**.
**Remediation:** move catalog, orders, and pricing to a backend/DB for any real deployment.

### 7. `target="_blank"` without `rel=noopener` — FIXED
The admin "Label" link opened a new tab without `rel`. Added `rel="noopener noreferrer"`.

### 8. Secrets handling — OK
The Admin Settings page only collects **publishable** keys / client IDs / location IDs (public by
design) — it does **not** collect secret keys. Secret keys belong in `server/.env`, as documented.
Keep it that way.

### 9. HTTPS in production — DEPLOY NOTE
Serve the site and the payment backend over HTTPS (required by all payment providers; prevents
MITM and mixed-content). Move the backend off `localhost` and update the endpoint URLs.

## Priorities for go-live
1. Real auth on Admin & POS (#2).
2. Server-side pricing/total validation before charging (#3).
3. CSP + security headers + HTTPS (#5, #9).
