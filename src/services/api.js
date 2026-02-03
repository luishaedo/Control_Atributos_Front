import { pad2 } from "../utils/sku.js";

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
    const msg = (isJSON && (body?.error || body?.message)) ? (body.error || body.message) : String(body || res.statusText);
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
const MASTER_TIMEOUT_MS = 8000;
export async function getMasterBySku(sku) {
  const limpio = String(sku || "").trim().toUpperCase();
  if (!limpio) throw new Error("SKU vacío");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MASTER_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API(`/maestro/${encodeURIComponent(limpio)}`), {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("No se pudo consultar el maestro. Reintentar. (timeout)");
    }
    throw new Error("No se pudo consultar el maestro. Reintentar.");
  } finally {
    clearTimeout(timeoutId);
  }
  if (res.status === 404) return null;
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
  if (!res.ok) {
    const msg = (isJSON && (body?.error || body?.message)) ? (body.error || body.message) : String(body || res.statusText);
    throw new Error(`No se pudo consultar el maestro. Reintentar. (${msg})`);
  }
  return isJSON ? body : {};
}

export async function getCampaignMasterBySku(campaniaId, sku) {
  const limpio = String(sku || "").trim().toUpperCase();
  const id = Number(campaniaId || 0);
  if (!id) throw new Error("Campaña inválida");
  if (!limpio) throw new Error("SKU vacío");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MASTER_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API(`/campanias/${id}/maestro/${encodeURIComponent(limpio)}`), {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("No se pudo consultar el maestro de la campaña. Reintentar. (timeout)");
    }
    throw new Error("No se pudo consultar el maestro de la campaña. Reintentar.");
  } finally {
    clearTimeout(timeoutId);
  }
  if (res.status === 404) return null;
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
  if (!res.ok) {
    const msg = (isJSON && (body?.error || body?.message)) ? (body.error || body.message) : String(body || res.statusText);
    throw new Error(`No se pudo consultar el maestro de la campaña. Reintentar. (${msg})`);
  }
  return isJSON ? body : {};
}

export async function getMaestroList({ q = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams({
    q: String(q || '').trim(),
    page: String(page),
    pageSize: String(pageSize),
  })
  return fetchJSON(`/maestro?${params.toString()}`)
}


export async function saveScan({
  email,
  sucursal,
  campaniaId,
  skuRaw,
  skuNormalized,
  sugeridos = {},
}) {
  const normalizeSuggestedCode = (value) => {
    const trimmed = String(value || "").trim();
    return trimmed ? pad2(trimmed) : "";
  };
  const body = {
    email: String(email||'').trim(),
    sucursal: String(sucursal||'').trim(),
    campaniaId: Number(campaniaId||0),
    skuRaw: String(skuRaw||'').trim(),
    skuNormalized: String(skuNormalized||'').trim(),
    sugeridos: {
      categoria_cod: normalizeSuggestedCode(sugeridos.categoria_cod),
      tipo_cod: normalizeSuggestedCode(sugeridos.tipo_cod),
      clasif_cod: normalizeSuggestedCode(sugeridos.clasif_cod),
    }
  }
  return fetchJSON(`/escaneos`, { method: "POST", body: JSON.stringify(body) });
}





export { API_BASE, API };
