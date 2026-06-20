# Payments setup

The site ships with a **provider-agnostic checkout layer** in
[`assets/js/payments.js`](assets/js/payments.js). Out of the box it runs in
**`demo`** mode — checkout works end-to-end but **no money moves**.

To accept real payments, pick one provider, set `PAYMENTS.provider`, and fill in
that provider's credentials at the top of `payments.js`. If a provider is selected
but its credentials are blank, the layer automatically falls back to `demo`, so the
site never breaks.

| Provider | Backend needed? | What you need |
|----------|-----------------|---------------|
| **PayPal** | ❌ No | A PayPal **Client ID** |
| **Stripe** | ✅ Yes (`/server`) | Publishable key + secret key |
| **Square** | ✅ Yes (`/server`) | App ID, Location ID, access token |

---

## Option A — PayPal (easiest, no server)

1. Create a PayPal **Business** account → https://developer.paypal.com → **Apps & Credentials**.
2. Copy your **Client ID** (use the *Sandbox* one to test first).
3. In `assets/js/payments.js`:
   ```js
   provider: "paypal",
   paypal: { clientId: "PASTE_YOUR_CLIENT_ID" },
   ```
4. Reload the site → the cart now shows real PayPal buttons (PayPal + card).
   Switch the Client ID to your **Live** one when ready to go live.

## Option B — Stripe (needs the backend in `/server`)

1. https://dashboard.stripe.com/apikeys → copy your **Publishable** and **Secret** keys.
2. Start the backend:
   ```bash
   cd server
   npm install
   cp .env.example .env        # then put STRIPE_SECRET_KEY in .env
   npm start                   # runs on http://localhost:4242
   ```
3. In `assets/js/payments.js`:
   ```js
   provider: "stripe",
   stripe: {
     publishableKey: "pk_test_xxx",
     createSessionUrl: "http://localhost:4242/api/stripe/create-checkout-session",
   },
   ```
4. Checkout now redirects to Stripe Checkout. Test with card `4242 4242 4242 4242`.

## Option C — Square (needs the backend in `/server`)

1. https://developer.squareup.com/apps → create an app → copy **Application ID**,
   **Location ID**, and an **Access Token**.
2. Start the backend (same as Stripe step 2, but fill in the `SQUARE_*` vars in `.env`).
3. In `assets/js/payments.js`:
   ```js
   provider: "square",
   square: {
     appId: "sandbox-sq0idb-xxx",
     locationId: "xxx",
     sandbox: true,                    // false for live
     paymentUrl: "http://localhost:4242/api/square/pay",
   },
   ```
4. Checkout shows a Square card form. Test card: `4111 1111 1111 1111`.

---

## Going to production
- Serve the static site and the `/server` backend over **HTTPS** (all three providers require it live).
- Move the backend off `localhost` (e.g. Render, Railway, Fly, a small VPS) and update the
  `createSessionUrl` / `paymentUrl` in `payments.js` to that URL.
- Never expose secret keys in the browser — they live only in `server/.env`.
- Verify the order total **server-side** before charging (the current scaffold trusts the
  amount sent from the browser — fine for testing, tighten before launch).
