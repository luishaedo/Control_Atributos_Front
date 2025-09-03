const API_BASE = (import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) || "http://localhost:4000";

// Helper para componer rutas SIEMPRE con /api
const API = (path = "") => `${API_BASE}/api${path}`;

// Manejo JSON genérico
async function fetchJSON(path, opts = {}) {
  const res = await fetch(API(path), {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}


export async function getDictionaries() {
  return fetchJSON("/diccionarios");
}

export async function getCampaigns() {
  return fetchJSON("/campanias");
}

export async function setActiveCampaign(id) {
  return fetchJSON(`/campanias/${id}/activar`, { method: "POST" });
}


