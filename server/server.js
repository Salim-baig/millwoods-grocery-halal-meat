/* ============================================================
   Optional payment backend for Millwoods Grocery & Halal Meat.
   Only needed if PAYMENTS.provider is "stripe" or "square".
   (PayPal works client-side and needs no backend.)

   Setup:
     1. cd server && npm install
     2. cp .env.example .env   and fill in your keys
     3. npm start              (runs on PORT, default 4242)

   The static site calls these endpoints (see assets/js/payments.js):
     POST /api/stripe/create-checkout-session
     POST /api/square/pay
   ============================================================ */
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());                 // allow the static site origin to call us
app.use(express.json());

const PORT = process.env.PORT || 4242;
const SITE_URL = process.env.SITE_URL || "http://localhost:9000";

/* ---------------------- Stripe ---------------------- */
// Creates a Stripe Checkout Session and returns its URL to redirect to.
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const { amount, currency = "CAD", description = "Order" } = req.body; // amount in cents

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: "Millwoods Halal — " + description },
        },
      }],
      success_url: `${SITE_URL}/cart.html?paid=1`,
      cancel_url: `${SITE_URL}/cart.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------- Square ---------------------- */
// Charges a card token (sourceId) produced by the Web Payments SDK.
app.post("/api/square/pay", async (req, res) => {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) throw new Error("SQUARE_ACCESS_TOKEN not set");
    const { Client, Environment } = require("square");
    const { randomUUID } = require("crypto");
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENV === "production"
        ? Environment.Production : Environment.Sandbox,
    });
    const { sourceId, amount, currency = "CAD" } = req.body; // amount in cents

    const { result } = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: { amount: BigInt(amount), currency },
      locationId: process.env.SQUARE_LOCATION_ID,
    });
    res.json({ ok: true, paymentId: result.payment.id });
  } catch (err) {
    console.error("[square]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/", (_req, res) => res.send("Millwoods Halal payment backend is running."));
app.listen(PORT, () => console.log(`Payment backend listening on http://localhost:${PORT}`));
