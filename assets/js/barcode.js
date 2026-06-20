/* ============================================================
   Barcode helper
   - value(p): a stable barcode string for a product. Uses an
     explicit p.barcode if set, otherwise derives a 12-digit
     store-internal code deterministically from the product id.
   - render(el, val): draws a scannable Code128 barcode into an
     <svg>/<canvas>/<img> element using JsBarcode (loaded from CDN
     on pages that need it). Falls back to plain text if offline.
   - lookup(code): finds a product (in the global PRODUCTS list)
     whose barcode matches a scanned code.
   ============================================================ */

const Barcode = (() => {
  function value(p) {
    if (p && p.barcode) return String(p.barcode).trim();
    // deterministic 10-digit hash of the id → 12-digit "20…" code
    let h = 0;
    const id = (p && p.id) || "";
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const ten = (h % 10000000000).toString().padStart(10, "0");
    return "20" + ten;
  }

  function render(el, val) {
    if (!el) return;
    if (window.JsBarcode) {
      try {
        window.JsBarcode(el, val, {
          format: "CODE128", width: 1.7, height: 50, fontSize: 13, margin: 6, displayValue: true,
        });
        return;
      } catch (e) { /* fall through */ }
    }
    el.textContent = val; // offline / no library fallback
  }

  // Find a product by scanned code (matches explicit or derived barcode).
  function lookup(code) {
    if (typeof PRODUCTS === "undefined") return null;
    const c = String(code).trim();
    return PRODUCTS.find((p) => value(p) === c || (p.barcode && String(p.barcode).trim() === c)) || null;
  }

  // Is this item priced by weight (meat/poultry sold per lb)?
  function isWeighed(p) {
    return !!p && (p.unit === "lb" || !!p.butcher);
  }

  return { value, render, lookup, isWeighed };
})();
