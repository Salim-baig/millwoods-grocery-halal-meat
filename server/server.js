/* ============================================================
   Millwoods Grocery & Halal Meat — backend
   ------------------------------------------------------------
   One Node process that:
     • serves the static site (so frontend + API share one origin)
     • takes online orders, validates prices SERVER-SIDE, persists
       them, and emails the customer a receipt + alerts the store
     • exposes a staff-authenticated Orders API for the admin
     • handles Stripe / Square payments with server-computed amounts

   Storage is a JSON file (server/data/orders.json) — simple and
   dependency-free. Swap for a real database for production scale.

   Setup:
     cd server && npm install
     cp .env.example .env   # then fill in values
     npm start              # http://localhost:4242

   NOTE ON HOSTING: a running Node server like this CANNOT be hosted
   on GitHub Pages (static only). See server/README.md for free,
   no-VM options.
   ============================================================ */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const app = express();
const PORT = process.env.PORT || 4242;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const STAFF_PASSCODE = process.env.STAFF_PASSCODE || "millwoods2026";
const SERVER_SECRET = process.env.SERVER_SECRET || "change-me-in-production";

/* ---------- middleware ---------- */
app.use(helmet({ contentSecurityPolicy: false })); // CSP off so inline scripts in the prototype still run
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

/* ---------- catalogue (authoritative prices, loaded from data.js) ---------- */
let CATALOG = { PRODUCTS: [], DELIVERY: null, STORE: null };
function loadCatalog() {
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "data.js"), "utf8");
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(src + "\n;globalThis.__C = { PRODUCTS, DELIVERY, STORE };", sandbox);
    CATALOG = sandbox.__C;
    console.log(`Loaded ${CATALOG.PRODUCTS.length} products from data.js`);
  } catch (e) { console.error("Catalog load failed:", e.message); }
}
loadCatalog();

/* ---------- pricing helpers (server-side source of truth) ---------- */
function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
function deliveryFee(postal) {
  const D = CATALOG.DELIVERY; if (!D) return D ? D.baseFee : 0;
  const fsa = String(postal || "").toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const zone = D.zones[fsa];
  if (!zone) return D.extendedFee;
  const km = haversineKm([D.store.lat, D.store.lng], [zone.lat, zone.lng]);
  return km <= D.baseRadiusKm ? D.baseFee : D.extendedFee;
}
// Recompute totals from authoritative prices. Returns null if an item is unknown.
function priceOrder(body) {
  const D = CATALOG.DELIVERY;
  const lines = [];
  let sub = 0;
  for (const item of body.lines || []) {
    const p = CATALOG.PRODUCTS.find((x) => x.id === item.id);
    if (!p) return { error: `Unknown product: ${item.id}` };
    const qty = Math.max(1, Number(item.qty) || 1);
    const factor = Number(item.weightFactor) || 1;          // weight packs for meat
    const lineTotal = +(p.price * qty * factor).toFixed(2);
    sub += lineTotal;
    lines.push({ id: p.id, name: p.name, qty, factor, unitPrice: p.price, lineTotal, options: item.options || null });
  }
  sub = +sub.toFixed(2);
  const isDelivery = body.mode === "delivery";
  const fee = !isDelivery ? 0 : (sub >= (D ? D.freeThreshold : 1e9) ? 0 : deliveryFee(body.customer && body.customer.postal));
  const gst = +(sub * 0.05).toFixed(2);
  const total = +(sub + fee + gst).toFixed(2);
  return { lines, sub, fee, gst, total, items: lines.reduce((n, l) => n + l.qty, 0) };
}

/* ---------- order storage (JSON file) ---------- */
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); } catch { return []; }
}
function writeOrders(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2));
}

/* ---------- staff auth (stateless token = HMAC of the passcode) ---------- */
function staffToken() { return crypto.createHmac("sha256", SERVER_SECRET).update(STAFF_PASSCODE).digest("hex"); }
function requireStaff(req, res, next) {
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (auth && crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(staffToken()))) return next();
  return res.status(401).json({ error: "unauthorized" });
}
app.post("/api/login", (req, res) => {
  if ((req.body && req.body.passcode) === STAFF_PASSCODE) return res.json({ token: staffToken() });
  return res.status(401).json({ error: "wrong passcode" });
});

/* ---------- email (nodemailer; optional) ---------- */
let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = require("nodemailer").createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
async function sendMail(to, subject, text) {
  if (!mailer || !to) return false;
  await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
  return true;
}
const money = (n) => "$" + Number(n).toFixed(2);
function receiptText(o) {
  const lines = o.lines.map((l) => `  • ${l.name} ×${l.qty} — ${money(l.lineTotal)}`).join("\n");
  return `Thank you for your order from Millwoods Grocery & Halal Meat!\n\nOrder: ${o.ref}\nWhen: ${o.slot ? o.slot.day + ", " + o.slot.time : "—"}\n${o.mode === "delivery" ? "Deliver to: " + (o.customer.address || "") : "Pickup in store"}\n\n${lines}\n\nSubtotal ${money(o.sub)}\n${o.fee ? "Delivery " + money(o.fee) + "\n" : ""}GST ${money(o.gst)}\nTotal ${money(o.total)}\nPaid: ${o.method}\n\nQuestions? Call (780) 485-3504. Shukran!`;
}
function alertText(o) {
  const c = o.customer || {};
  return `NEW ${o.mode.toUpperCase()} ORDER ${o.ref}\nWhen: ${o.slot ? o.slot.day + ", " + o.slot.time : "—"}\nTotal: ${money(o.total)} (${o.items} items) · ${o.method}\n\n${c.name}\n${c.phone}\n${c.email}\n${o.mode === "delivery" ? c.address : "Pickup"}\n\n${o.lines.map((l) => `• ${l.name} ×${l.qty}`).join("\n")}`;
}

/* ---------- orders API ---------- */
// Create an online order (public). Prices are recomputed server-side.
app.post("/api/orders", async (req, res) => {
  const b = req.body || {};
  if (!b.customer || !b.customer.email || !b.customer.name) return res.status(400).json({ error: "missing customer details" });
  const priced = priceOrder(b);
  if (priced.error) return res.status(400).json({ error: priced.error });

  const order = {
    ref: "MWH-" + Math.floor(100000 + Math.random() * 900000),
    ts: Date.now(),
    mode: b.mode === "pickup" ? "pickup" : "delivery",
    slot: b.slot || null,
    customer: { name: b.customer.name, phone: b.customer.phone, email: b.customer.email, address: b.customer.address || "" },
    lines: priced.lines, sub: priced.sub, fee: priced.fee, gst: priced.gst, total: priced.total,
    items: priced.items, method: b.method || "Pending", status: "new",
  };
  const orders = readOrders(); orders.push(order); writeOrders(orders);

  // fire-and-forget emails
  sendMail(order.customer.email, `Your Millwoods order ${order.ref}`, receiptText(order)).catch((e) => console.error("receipt:", e.message));
  sendMail(process.env.STORE_EMAIL, `New order ${order.ref}`, alertText(order)).catch((e) => console.error("alert:", e.message));

  res.json({ ok: true, ref: order.ref, total: order.total, order });
});
// List orders (staff only).
app.get("/api/orders", requireStaff, (req, res) => {
  res.json(readOrders().sort((a, b) => b.ts - a.ts));
});
// Update an order's status (staff only).
app.patch("/api/orders/:ref", requireStaff, (req, res) => {
  const orders = readOrders();
  const o = orders.find((x) => x.ref === req.params.ref);
  if (!o) return res.status(404).json({ error: "not found" });
  o.status = (req.body && req.body.status) || o.status;
  writeOrders(orders);
  res.json({ ok: true, order: o });
});

/* ---------- payments (amount computed server-side from the order) ---------- */
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const priced = priceOrder(req.body || {});
    if (priced.error) throw new Error(priced.error);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "cad", unit_amount: Math.round(priced.total * 100), product_data: { name: "Millwoods Halal order" } } }],
      success_url: `${SITE_URL}/cart.html?paid=1`,
      cancel_url: `${SITE_URL}/cart.html`,
    });
    res.json({ url: session.url, total: priced.total });
  } catch (e) { console.error("[stripe]", e.message); res.status(500).json({ error: e.message }); }
});
app.post("/api/square/pay", async (req, res) => {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) throw new Error("SQUARE_ACCESS_TOKEN not set");
    const { Client, Environment } = require("square");
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENV === "production" ? Environment.Production : Environment.Sandbox,
    });
    const priced = priceOrder(req.body || {});
    if (priced.error) throw new Error(priced.error);
    const { result } = await client.paymentsApi.createPayment({
      sourceId: req.body.sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: { amount: BigInt(Math.round(priced.total * 100)), currency: "CAD" },
      locationId: process.env.SQUARE_LOCATION_ID,
    });
    res.json({ ok: true, paymentId: result.payment.id, total: priced.total });
  } catch (e) { console.error("[square]", e.message); res.status(500).json({ ok: false, error: e.message }); }
});

/* ---------- health + static site ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true, products: CATALOG.PRODUCTS.length, orders: readOrders().length }));
// Never expose the backend folder; dotfiles (.env, .git) are ignored by default.
app.use((req, res, next) => (/^\/server(\/|$)/.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(path.join(__dirname, ".."), { extensions: ["html"] }));

app.listen(PORT, () => console.log(`Millwoods backend on ${SITE_URL}`));
