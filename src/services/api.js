const API_BASE = (import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) || window.location.origin;

// SIEMPRE pega a /api
const API = (path = "") => `${API_BASE}/api${path}`;

async function fetchJSON(path, opts = {}) {
  const res = await fetch(API(path), {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const msg = (isJSON && body?.error) ? body.error : String(body || res.statusText);
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${msg}`);
  }
  return isJSON ? body : {};
}

export async function getDictionaries() {
  return fetchJSON("/diccionarios");
}

export async function getCampaigns() {
  const data = await fetchJSON("/campanias");
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export async function setActiveCampaign(id) {
  return fetchJSON(`/campanias/${id}/activar`, { method: "POST" });
}

// ---- Maestro + Escaneos
export async function getMasterBySku(sku) {
  const limpio = String(sku || "").trim().toUpperCase();
  if (!limpio) throw new Error("SKU vacío");
  return fetchJSON(`/maestro/${encodeURIComponent(limpio)}`);
}

export async function getMaestroList({ q = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams({
    q: String(q || '').trim(),
    page: String(page),
    pageSize: String(pageSize),
  })
  return fetchJSON(`/maestro?${params.toString()}`)
}


export async function saveScan({ email, sucursal, campaniaId, skuRaw, sugeridos = {} }) {
  const body = {
    email: String(email||'').trim(),
    sucursal: String(sucursal||'').trim(),
    campaniaId: Number(campaniaId||0),
    skuRaw: String(skuRaw||'').trim(),
    sugeridos: {
      categoria_cod: String(sugeridos.categoria_cod||''),
      tipo_cod:      String(sugeridos.tipo_cod||''),
      clasif_cod:    String(sugeridos.clasif_cod||''),
    }
  }
  return fetchJSON(`/escaneos`, { method: "POST", body: JSON.stringify(body) });
}





export { API_BASE, API };
