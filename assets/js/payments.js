/* ============================================================
   Payments — provider-agnostic checkout layer
   ------------------------------------------------------------
   Default provider is "demo" (simulated checkout, no money moves).
   To go live, set PAYMENTS.provider and fill in the credentials
   for that provider below. See PAYMENTS.md for full instructions.

     • paypal  — client-side, NO backend needed
     • stripe  — needs the backend in /server (Stripe Checkout)
     • square  — needs the backend in /server (Web Payments SDK)

   If a provider is selected but its credentials are blank, this
   layer automatically falls back to "demo" so the site keeps
   working.
   ============================================================ */

const PAYMENTS = {
  // "demo" | "paypal" | "stripe" | "square"
  provider: "demo",
  currency: "CAD",

  // ---- PayPal (client-side, no backend) ---------------------
  // Get a Client ID: https://developer.paypal.com → Apps & Credentials
  paypal: {
    clientId: "",          // e.g. "AYxxxxxx..."  (blank = stay in demo)
  },

  // ---- Stripe (needs /server running) -----------------------
  // Publishable key from https://dashboard.stripe.com/apikeys
  stripe: {
    publishableKey: "",                                  // "pk_live_..." or "pk_test_..."
    createSessionUrl: "http://localhost:4242/api/stripe/create-checkout-session",
  },

  // ---- Square (needs /server running) -----------------------
  square: {
    appId: "",                                           // "sq0idp-..." / sandbox "sandbox-sq0idb-..."
    locationId: "",                                      // your Square location id
    sandbox: true,                                       // true = sandbox SDK
    paymentUrl: "http://localhost:4242/api/square/pay",
  },
};

// Merge any payment config saved from the Admin → Settings page.
(function mergeAdminPaymentConfig() {
  try {
    const c = JSON.parse(localStorage.getItem("mwh_admin_payments"));
    if (!c) return;
    if (c.provider) PAYMENTS.provider = c.provider;
    if (c.currency) PAYMENTS.currency = c.currency;
    if (c.paypalClientId) PAYMENTS.paypal.clientId = c.paypalClientId;
    if (c.stripePublishableKey) PAYMENTS.stripe.publishableKey = c.stripePublishableKey;
    if (c.stripeSessionUrl) PAYMENTS.stripe.createSessionUrl = c.stripeSessionUrl;
    if (c.squareAppId) PAYMENTS.square.appId = c.squareAppId;
    if (c.squareLocationId) PAYMENTS.square.locationId = c.squareLocationId;
  } catch (e) { /* ignore */ }
})();

const Payments = (() => {
  /* Effective provider — auto-fallback to demo if not configured. */
  function provider() {
    const p = PAYMENTS.provider;
    if (p === "paypal" && !PAYMENTS.paypal.clientId) return "demo";
    if (p === "stripe" && !PAYMENTS.stripe.publishableKey) return "demo";
    if (p === "square" && !PAYMENTS.square.appId) return "demo";
    return p;
  }

  function loadScript(src, id) {
    return new Promise((resolve, reject) => {
      if (id && document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      s.src = src; if (id) s.id = id;
      s.onload = resolve; s.onerror = () => reject(new Error("load failed: " + src));
      document.head.appendChild(s);
    });
  }

  function note(text) {
    return `<p style="font-size:0.78rem;color:var(--muted);text-align:center;margin-top:10px;">${text}</p>`;
  }

  /* Main entry. ctx = { ready, blocker, order, onSuccess } */
  function render(container, ctx) {
    if (!container) return;
    const p = provider();

    if (!ctx.ready) {
      container.dataset.sig = "";
      container.innerHTML =
        `<button class="btn btn-primary btn-block" style="padding:14px;" disabled>Complete the steps above</button>` +
        (ctx.blocker ? note("⚠️ " + ctx.blocker) : "");
      return;
    }

    // Avoid needlessly re-rendering provider widgets (e.g. PayPal buttons).
    const sig = p + "|" + ctx.order.total;
    if (container.dataset.sig === sig && p !== "demo") return;
    container.dataset.sig = sig;

    if (p === "paypal") return renderPayPal(container, ctx);
    if (p === "stripe") return renderStripe(container, ctx);
    if (p === "square") return renderSquare(container, ctx);
    return renderDemo(container, ctx);
  }

  /* ---- Demo (simulated) ---- */
  function renderDemo(container, ctx) {
    container.innerHTML =
      `<button class="btn btn-primary btn-block" style="padding:14px;">Place order · ${ctx.order.total}</button>` +
      note("🔒 Simulated checkout — no payment is taken in this prototype.");
    container.querySelector("button").onclick = () =>
      ctx.onSuccess({ method: "Simulated", ref: null, totalNum: ctx.order.totalNum });
  }

  /* ---- PayPal (client-side) ---- */
  function renderPayPal(container, ctx) {
    container.innerHTML =
      `<div id="paypal-buttons"></div>` + note("🔒 Secured by PayPal. Pay by PayPal or card.");
    loadScript(
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYMENTS.paypal.clientId)}&currency=${PAYMENTS.currency}`,
      "paypal-sdk"
    ).then(() => {
      if (!window.paypal) return;
      window.paypal.Buttons({
        style: { color: "gold", shape: "rect", label: "pay", height: 48 },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            amount: { value: ctx.order.totalNum.toFixed(2), currency_code: PAYMENTS.currency },
            description: `${STORE.short} order (${ctx.order.items} items)`,
          }],
        }),
        onApprove: (data, actions) => actions.order.capture().then((details) =>
          ctx.onSuccess({ method: "PayPal", ref: details.id, totalNum: ctx.order.totalNum })),
        onError: (err) => { console.error(err); UI.toast("Payment could not be completed."); },
      }).render("#paypal-buttons");
    }).catch((e) => {
      container.innerHTML = note("⚠️ Couldn't load PayPal. Check the Client ID / connection.");
      console.error(e);
    });
  }

  /* ---- Stripe (redirect to Stripe Checkout via backend) ---- */
  function renderStripe(container, ctx) {
    container.innerHTML =
      `<button class="btn btn-primary btn-block" style="padding:14px;">Pay with card · ${ctx.order.total}</button>` +
      note("🔒 Secured by Stripe.");
    container.querySelector("button").onclick = async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = "Redirecting…";
      try {
        const r = await fetch(PAYMENTS.stripe.createSessionUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency: PAYMENTS.currency, amount: Math.round(ctx.order.totalNum * 100),
            items: ctx.order.items, description: `${STORE.short} order`,
          }),
        });
        const { url } = await r.json();
        if (url) { window.location = url; return; }
        throw new Error("no session url");
      } catch (err) {
        console.error(err); btn.disabled = false; btn.textContent = `Pay with card · ${ctx.order.total}`;
        UI.toast("Stripe backend not reachable — see PAYMENTS.md.");
      }
    };
  }

  /* ---- Square (Web Payments SDK card form + backend) ---- */
  function renderSquare(container, ctx) {
    container.innerHTML =
      `<div id="sq-card" style="margin-bottom:10px;"></div>` +
      `<button class="btn btn-primary btn-block" style="padding:14px;">Pay · ${ctx.order.total}</button>` +
      note("🔒 Secured by Square.");
    const sdk = PAYMENTS.square.sandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";
    loadScript(sdk, "square-sdk").then(async () => {
      const payments = window.Square.payments(PAYMENTS.square.appId, PAYMENTS.square.locationId);
      const card = await payments.card();
      await card.attach("#sq-card");
      container.querySelector("button").onclick = async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = "Processing…";
        try {
          const result = await card.tokenize();
          if (result.status !== "OK") throw new Error("tokenize failed");
          const r = await fetch(PAYMENTS.square.paymentUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceId: result.token, amount: Math.round(ctx.order.totalNum * 100),
              currency: PAYMENTS.currency,
            }),
          });
          const data = await r.json();
          if (!data.ok) throw new Error("charge failed");
          ctx.onSuccess({ method: "Square", ref: data.paymentId, totalNum: ctx.order.totalNum });
        } catch (err) {
          console.error(err); btn.disabled = false; btn.textContent = `Pay · ${ctx.order.total}`;
          UI.toast("Square payment failed — see PAYMENTS.md.");
        }
      };
    }).catch((e) => {
      container.innerHTML = note("⚠️ Couldn't load Square. Check the App ID / connection.");
      console.error(e);
    });
  }

  return { render, provider };
})();
