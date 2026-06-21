/* ============================================================
   API — optional bridge to the backend (server/).
   When a backend URL is set (Admin → Settings → Backend API URL,
   stored in localStorage "mwh_api_base"), the storefront sends
   orders to the server and the admin reads/updates them there, so
   orders sync across devices.

   When NO URL is set, API.on() is false and every page falls back
   to the existing localStorage behaviour — the static GitHub Pages
   site keeps working unchanged.
   ============================================================ */
const API = (() => {
  function base() {
    let b = "";
    try { b = localStorage.getItem("mwh_api_base") || ""; } catch (e) {}
    return b.replace(/\/+$/, "");
  }
  function on() { return !!base(); }
  function token() { try { return localStorage.getItem("mwh_staff_token") || ""; } catch (e) { return ""; } }

  async function jget(url, opts) {
    const r = await fetch(base() + url, opts);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw Object.assign(new Error(e.error || r.statusText), { status: r.status }); }
    return r.json();
  }

  async function login(passcode) {
    const { token } = await jget("/api/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }),
    });
    try { localStorage.setItem("mwh_staff_token", token); } catch (e) {}
    return token;
  }
  function createOrder(payload) {
    return jget("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  }
  function listOrders() {
    return jget("/api/orders", { headers: { Authorization: "Bearer " + token() } });
  }
  function setStatus(ref, status) {
    return jget("/api/orders/" + encodeURIComponent(ref), {
      method: "PATCH", headers: { "content-type": "application/json", Authorization: "Bearer " + token() }, body: JSON.stringify({ status }),
    });
  }

  return { base, on, token, login, createOrder, listOrders, setStatus };
})();
