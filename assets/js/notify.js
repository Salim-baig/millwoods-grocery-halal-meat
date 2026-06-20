/* ============================================================
   Notify — email the customer a receipt and alert the store of a
   new online order. Uses EmailJS (https://www.emailjs.com) so it
   works from a static site with no backend.

   Configure in Admin → Settings (saved to localStorage
   "mwh_admin_notify"):
     • storeEmail              — where new-order alerts go
     • emailjs.publicKey       — EmailJS Public Key
     • emailjs.serviceId       — EmailJS Service ID
     • emailjs.templateId      — EmailJS Template ID

   The template should accept these variables:
     {{to_email}}  {{subject}}  {{message}}  {{order_ref}}

   If EmailJS isn't configured, Notify runs in "demo" mode: it does
   not send, but the order is still recorded and shown in Admin, and
   the UI says email is pending configuration.
   ============================================================ */

const Notify = (() => {
  const KEY = "mwh_admin_notify";

  function config() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function isConfigured() {
    const c = config().emailjs || {};
    return !!(c.publicKey && c.serviceId && c.templateId);
  }

  let sdk = null;
  function loadSdk() {
    if (sdk) return sdk;
    sdk = new Promise((resolve, reject) => {
      if (window.emailjs) return resolve(window.emailjs);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      s.onload = () => resolve(window.emailjs);
      s.onerror = () => reject(new Error("EmailJS SDK failed to load"));
      document.head.appendChild(s);
    });
    return sdk;
  }

  async function send(toEmail, subject, message, orderRef) {
    if (!isConfigured() || !toEmail) return { sent: false, reason: "not-configured" };
    const c = config().emailjs;
    const emailjs = await loadSdk();
    emailjs.init({ publicKey: c.publicKey });
    await emailjs.send(c.serviceId, c.templateId, {
      to_email: toEmail, subject, message, order_ref: orderRef || "",
    });
    return { sent: true };
  }

  function money(n) { return "$" + Number(n).toFixed(2); }

  function receiptText(o) {
    const lines = (o.lines || []).map((l) =>
      `  • ${l.name} — ${l.qtyLabel || (l.qty + " ×")}  ${money(l.lineTotal)}`).join("\n");
    const fulfil = o.mode === "delivery"
      ? `Delivery to:\n  ${o.customer ? o.customer.address : ""}`
      : "Pickup at store";
    return [
      `Thank you for your order from Millwoods Grocery & Halal Meat!`,
      ``,
      `Order: ${o.ref}`,
      `When: ${o.slot ? o.slot.day + ", " + o.slot.time : "—"}`,
      fulfil,
      ``,
      `Items:`,
      lines || "  (see store)",
      ``,
      `Subtotal: ${money(o.sub != null ? o.sub : o.total)}`,
      o.fee ? `Delivery: ${money(o.fee)}` : ``,
      o.gst != null ? `GST (5%): ${money(o.gst)}` : ``,
      `Total: ${money(o.total)}`,
      `Paid: ${o.method}`,
      ``,
      `Questions? Call (780) 485-3504. Shukran!`,
    ].filter((x) => x !== ``).join("\n");
  }

  function alertText(o) {
    const c = o.customer || {};
    return [
      `🛎️ NEW ONLINE ORDER — ${o.ref}`,
      ``,
      `${o.mode === "delivery" ? "DELIVERY" : "PICKUP"} · ${o.slot ? o.slot.day + ", " + o.slot.time : "—"}`,
      `Total: ${money(o.total)} (${o.items} items) · Paid: ${o.method}`,
      ``,
      `Customer:`,
      `  ${c.name || "—"}`,
      `  ${c.phone || "—"}`,
      `  ${c.email || "—"}`,
      o.mode === "delivery" ? `  ${c.address || "—"}` : ``,
      ``,
      `Prepare and ${o.mode === "delivery" ? "deliver in the chosen window" : "have ready for pickup"}.`,
    ].filter((x) => x !== ``).join("\n");
  }

  // Fire both emails for a completed online order. Never throws.
  async function notifyOrder(o) {
    const result = { receipt: false, alert: false, configured: isConfigured() };
    if (!isConfigured()) return result;
    const storeEmail = config().storeEmail;
    try { if (o.customer && o.customer.email) { await send(o.customer.email, `Your Millwoods order ${o.ref}`, receiptText(o), o.ref); result.receipt = true; } } catch (e) { console.error("receipt email:", e); }
    try { if (storeEmail) { await send(storeEmail, `New order ${o.ref} — ${o.mode}`, alertText(o), o.ref); result.alert = true; } } catch (e) { console.error("alert email:", e); }
    return result;
  }

  return { config, isConfigured, notifyOrder, send, receiptText, alertText };
})();
