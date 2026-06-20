/* ============================================================
   Store: cart + delivery-zone state (persisted in localStorage)
   ============================================================ */

const Store = (() => {
  const CART_KEY = "mwh_cart";
  const ZONE_KEY = "mwh_zone";    // verified postal code + zone info
  const ORDERS_KEY = "mwh_orders";        // completed orders (for revenue)
  const CATALOG_KEY = "mwh_admin_catalog"; // { overrides, added, hidden }
  let BASE_PRODUCTS = [];                  // pristine snapshot of built-in products

  /* ---------- low-level persistence ---------- */
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  /* ---------- cart ---------- */
  function getCart() { return read(CART_KEY, []); }
  function saveCart(cart) { write(CART_KEY, cart); document.dispatchEvent(new Event("cart:changed")); }

  function cartCount() { return getCart().reduce((n, i) => n + i.qty, 0); }
  function cartSubtotal() { return getCart().reduce((s, i) => s + i.lineTotal, 0); }

  /* Add an item. `options` captures butcher selections so the same
     product with different cuts is treated as a distinct line.     */
  function addItem(product, { qty = 1, options = null, unitPrice = null } = {}) {
    const cart = getCart();
    const price = unitPrice ?? product.price;
    const optKey = options ? JSON.stringify(options) : "";
    const key = product.id + "|" + optKey;
    const existing = cart.find((i) => i.key === key);
    if (existing) {
      existing.qty += qty;
      existing.lineTotal = +(existing.unitPrice * existing.qty).toFixed(2);
    } else {
      cart.push({
        key,
        id: product.id,
        name: product.name,
        emoji: product.emoji || "🛒",
        halal: product.halal,
        unit: product.unit,
        options,
        unitPrice: +price.toFixed(2),
        qty,
        lineTotal: +(price * qty).toFixed(2),
      });
    }
    saveCart(cart);
  }

  function updateQty(key, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.key === key);
    if (!item) return;
    item.qty = Math.max(1, qty);
    item.lineTotal = +(item.unitPrice * item.qty).toFixed(2);
    saveCart(cart);
  }

  function removeItem(key) { saveCart(getCart().filter((i) => i.key !== key)); }
  function clearCart() { saveCart([]); }

  /* ---------- delivery zone ---------- */
  function normalizePostal(raw) {
    return (raw || "").toUpperCase().replace(/\s+/g, "");
  }
  function isValidPostalFormat(raw) {
    // Canadian: A1A 1A1
    return /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test((raw || "").trim());
  }
  // Great-circle distance (km) between two [lat, lng] points.
  function haversineKm(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
  }
  function distanceFromStore(lat, lng) {
    return haversineKm([DELIVERY.store.lat, DELIVERY.store.lng], [lat, lng]);
  }

  function checkZone(raw) {
    const clean = normalizePostal(raw);
    const fsa = clean.slice(0, 3);
    const base = DELIVERY.zones[fsa];
    let zone = null, inZone = false;
    if (base) {
      const km = distanceFromStore(base.lat, base.lng);
      inZone = km <= DELIVERY.maxRadiusKm;
      const eta = km <= DELIVERY.baseRadiusKm ? "Same-day" : "Next-day";
      zone = Object.assign({}, base, { km, eta });
    }
    return {
      valid: isValidPostalFormat(raw),
      fsa,
      inZone,
      zone,
      formatted: clean.length >= 6 ? clean.slice(0, 3) + " " + clean.slice(3, 6) : clean,
    };
  }
  function saveZone(info) { write(ZONE_KEY, info); }
  function getZone() { return read(ZONE_KEY, null); }

  /* Delivery fee: flat $5 within 5 km, $8 for 5–10 km, free over the
     order threshold. `zone` is a DELIVERY.zones entry (has .km).      */
  function deliveryFee(zone, subtotal) {
    if (!zone) return DELIVERY.extendedFee;
    if (subtotal >= DELIVERY.freeThreshold) return 0;
    return zone.km <= DELIVERY.baseRadiusKm ? DELIVERY.baseFee : DELIVERY.extendedFee;
  }

  /* ---------- orders (revenue) ---------- */
  function getOrders() { return read(ORDERS_KEY, []); }
  function recordOrder(o) { const a = getOrders(); a.push(o); write(ORDERS_KEY, a); }
  function clearOrders() { write(ORDERS_KEY, []); }

  // Aggregate revenue over [startTs, endTs] (epoch ms).
  function revenueReport(startTs, endTs) {
    const orders = getOrders().filter((o) => o.ts >= startTs && o.ts <= endTs);
    const total = orders.reduce((s, o) => s + (o.total || 0), 0);
    const items = orders.reduce((s, o) => s + (o.items || 0), 0);
    const count = orders.length;
    return { total, items, count, avg: count ? total / count : 0, orders };
  }

  // Generate ~1 year of realistic sample orders for the dashboard demo.
  function seedSampleOrders() {
    const now = Date.now(), day = 86400000, orders = [];
    let ref = 100000;
    for (let d = 365; d >= 0; d--) {
      const date = now - d * day, dow = new Date(date).getDay();
      const busy = (dow === 5 || dow === 6) ? 5 : 3;          // Fri/Sat busier
      const n = Math.floor(Math.random() * busy);
      for (let i = 0; i < n; i++) {
        orders.push({
          ref: "MWH-" + (ref++),
          ts: date + Math.floor(Math.random() * day),
          total: Math.round((20 + Math.random() * 180) * 100) / 100,
          items: 1 + Math.floor(Math.random() * 8),
          mode: Math.random() < 0.6 ? "delivery" : "pickup",
          method: ["Simulated", "PayPal", "Stripe"][Math.floor(Math.random() * 3)],
        });
      }
    }
    orders.sort((a, b) => a.ts - b.ts);
    write(ORDERS_KEY, orders);
    return orders.length;
  }

  /* ---------- admin catalog edits ---------- */
  function getCatalogEdits() { return read(CATALOG_KEY, { overrides: {}, added: [], hidden: [] }); }
  function saveCatalogEdits(e) { write(CATALOG_KEY, e); }
  function getBaseProducts() { return BASE_PRODUCTS; }

  // Mutate the global PRODUCTS array so the storefront reflects admin edits.
  function applyCatalogEdits() {
    if (typeof PRODUCTS === "undefined") return;
    BASE_PRODUCTS = PRODUCTS.map((p) => Object.assign({}, p)); // pristine built-ins
    const e = getCatalogEdits();
    PRODUCTS.forEach((p) => { if (e.overrides[p.id]) Object.assign(p, e.overrides[p.id]); });
    (e.added || []).forEach((np) => { if (!PRODUCTS.find((p) => p.id === np.id)) PRODUCTS.push(np); });
    (e.hidden || []).forEach((id) => {
      const i = PRODUCTS.findIndex((p) => p.id === id);
      if (i >= 0) PRODUCTS.splice(i, 1);
    });
  }
  applyCatalogEdits();

  return {
    getCart, addItem, updateQty, removeItem, clearCart,
    cartCount, cartSubtotal,
    checkZone, saveZone, getZone, deliveryFee, normalizePostal, isValidPostalFormat,
    getOrders, recordOrder, clearOrders, revenueReport, seedSampleOrders,
    getCatalogEdits, saveCatalogEdits, getBaseProducts,
  };
})();
