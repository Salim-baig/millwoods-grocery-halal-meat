/* ============================================================
   Shared UI: header, footer, badges, toasts
   Each page sets `window.PAGE` to highlight the active nav link.
   ============================================================ */

const UI = (() => {
  function badge(halalCode) {
    const h = HALAL[halalCode];
    if (!h) return "";
    const cls = h.color === "blue" ? "halal-blue" : "halal-green";
    return `<span class="halal-badge ${cls}" title="${h.desc}">${h.short}</span>`;
  }

  function money(n) { return "$" + Number(n).toFixed(2); }

  // Escape untrusted text before inserting into HTML (prevents XSS).
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* Inner markup for a product thumbnail: real photo with an emoji
     fallback (if the image fails to load) plus the halal badge.
     Use inside a positioned container (.product-thumb / .pdp-image). */
  function thumbInner(p) {
    const src = p.image || `assets/img/${p.id}.jpg`;
    return `<img class="thumb-photo" src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`
      + `<span class="thumb-emoji">${p.emoji}</span>`
      + badge(p.halal);
  }

  function navLink(href, label, key) {
    const active = window.PAGE === key ? "active" : "";
    return `<a class="${active}" href="${href}">${label}</a>`;
  }

  // Today's open status, from STORE.hours indexed by Date.getDay().
  function todayHours() {
    const h = STORE.hours[new Date().getDay()];
    if (!h || h.closed) return "Closed today";
    return `Open today · ${h.open}–${h.close}`;
  }
  // Full weekly hours, with today highlighted.
  function hoursList() {
    const today = new Date().getDay();
    return STORE.hours.map((h, i) => {
      const t = h.closed ? "Closed" : `${h.open} – ${h.close}`;
      const hl = i === today ? "color:#fff;font-weight:600;" : "";
      return `<div style="${hl}"><span style="display:inline-block;width:92px;">${h.day}</span>${t}</div>`;
    }).join("");
  }

  function renderHeader() {
    const count = Store.cartCount();
    return `
    <header class="site-header">
      <div class="topbar">
        <div class="wrap">
          <span>📍 ${STORE.address} · 🕒 ${todayHours()}</span>
          <span>📞 ${STORE.phone}</span>
        </div>
      </div>
      <div class="wrap">
        <nav class="nav">
          <a class="brand" href="index.html">
            <span class="logo">🥩</span>
            <span><b>${STORE.name}</b><span>Mill Woods, Edmonton</span></span>
          </a>
          <div class="nav-links" id="navLinks">
            ${navLink("index.html", "Home", "home")}
            ${navLink("shop.html", "Shop", "shop")}
            ${navLink("recipes.html", "Recipes", "recipes")}
            ${navLink("standards.html", "Our Standards", "standards")}
            ${navLink("community.html", "Community", "community")}
            <a class="btn btn-primary btn-sm cart-btn" href="cart.html" style="margin-left:8px;">
              🛒 Cart <span class="cart-count" id="cartCount" ${count ? "" : 'style="display:none"'}>${count}</span>
            </a>
          </div>
          <button class="hamburger" id="hamburger" aria-label="Menu">☰</button>
        </nav>
      </div>
    </header>`;
  }

  function renderFooter() {
    return `
    <footer class="site-footer">
      <div class="wrap">
        <div>
          <h4>${STORE.name}</h4>
          <p class="muted">Your neighbourhood source for fresh Zabiha meat, halal groceries,
          and South Asian & Middle Eastern essentials — delivered across Mill Woods, Edmonton.</p>
          <p class="muted" style="margin-top:10px;">${STORE.address}<br>${STORE.phone} · ${STORE.email}</p>
          <h4 style="margin-top:16px;">Store Hours</h4>
          <div class="muted" style="font-size:0.84rem;line-height:1.6;">${hoursList()}</div>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="shop.html">All Products</a>
          <a href="shop.html#Zabiha Meat">Zabiha Meat</a>
          <a href="shop.html#Poultry">Poultry</a>
          <a href="recipes.html">Recipe Bundles</a>
        </div>
        <div>
          <h4>Trust</h4>
          <a href="standards.html">Our Standards</a>
          <a href="standards.html">Supplier Certificates</a>
          <a href="community.html">Community Board</a>
          <a href="community.html">Prayer Times</a>
        </div>
        <div>
          <h4>Help</h4>
          <a href="cart.html">Delivery & Pickup</a>
          <a href="index.html#zone">Check Your Postal Code</a>
          <a href="mailto:${STORE.email}">Contact Us</a>
          <a href="admin.html">Staff Admin</a>
          <a href="pos.html">Counter POS</a>
        </div>
      </div>
      <div class="footer-bottom">
        © 2026 ${STORE.name}. Prototype site — checkout is simulated.
      </div>
    </footer>`;
  }

  function mount() {
    const h = document.getElementById("header");
    const f = document.getElementById("footer");
    if (h) h.innerHTML = renderHeader();
    if (f) f.innerHTML = renderFooter();

    // mobile menu
    const ham = document.getElementById("hamburger");
    if (ham) ham.addEventListener("click", () => {
      document.getElementById("navLinks").classList.toggle("open");
    });

    // keep cart count in sync
    document.addEventListener("cart:changed", refreshCount);
  }

  function refreshCount() {
    const el = document.getElementById("cartCount");
    if (!el) return;
    const c = Store.cartCount();
    el.textContent = c;
    el.style.display = c ? "" : "none";
  }

  /* ---------- toast ---------- */
  let toastWrap;
  function toast(msg) {
    if (!toastWrap) {
      toastWrap = document.createElement("div");
      toastWrap.className = "toast-wrap";
      document.body.appendChild(toastWrap);
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="ic">✓</span> ${msg}`;
    toastWrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(30px)"; t.style.transition = ".3s"; }, 2400);
    setTimeout(() => t.remove(), 2800);
  }

  return { badge, money, esc, thumbInner, mount, renderHeader, renderFooter, toast, refreshCount };
})();

document.addEventListener("DOMContentLoaded", UI.mount);
