import { pad2 } from "../utils/sku.js";
import { API_BASE, API } from "./apiBase.js";
import { fetchHttpJson } from "./httpClient.js";

const INITIAL_LOAD_TIMEOUT_MS = 10000;
const MASTER_TIMEOUT_MS = 8000;

function isRetriableError(error) {
  return (
    error?.name === "AbortError" ||
    /timeout/i.test(String(error?.message || "")) ||
    /Failed to fetch/i.test(String(error?.message || ""))
  );
}

async function fetchWithRetry(path, opts = {}, { retries = 1, retryDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchJSON(path, opts);
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetriableError(error)) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastError;
}

async function fetchJSON(path, opts = {}) {
  const {
    timeoutMs = 0,
    signal: externalSignal,
    onRequestError,
    onHttpError,
    returnNullOn404 = false,
    ...requestOptions
  } = opts;

  return fetchHttpJson(API(path), {
    timeoutMs,
    signal: externalSignal,
    onRequestError,
    onHttpError,
    returnNullOn404,
    ...requestOptions,
  });
}


export async function getDictionaries(opts = {}) {
  return fetchWithRetry(
    "/diccionarios",
    { timeoutMs: INITIAL_LOAD_TIMEOUT_MS, ...opts },
    { retries: 1, retryDelayMs: 500 }
  );
}

export async function getCampaigns(opts = {}) {
  const data = await fetchWithRetry(
    "/campanias",
    { timeoutMs: INITIAL_LOAD_TIMEOUT_MS, ...opts },
    { retries: 1, retryDelayMs: 500 }
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export async function getMasterBySku(sku) {
  const limpio = String(sku || "").trim().toUpperCase();
  if (!limpio) throw new Error("SKU vacío");

  return fetchJSON(`/maestro/${encodeURIComponent(limpio)}`, {
    timeoutMs: MASTER_TIMEOUT_MS,
    returnNullOn404: true,
    onRequestError: (error) => {
      if (/timeout/i.test(String(error?.message || ""))) {
        return new Error("No se pudo consultar el maestro. Reintentar. (timeout)");
      }
      return new Error("No se pudo consultar el maestro. Reintentar.");
    },
    onHttpError: ({ message }) => new Error(`No se pudo consultar el maestro. Reintentar. (${message})`),
  });
}

export async function getCampaignMasterBySku(campaniaId, sku) {
  const limpio = String(sku || "").trim().toUpperCase();
  const id = Number(campaniaId || 0);
  if (!id) throw new Error("Campaña inválida");
  if (!limpio) throw new Error("SKU vacío");

  return fetchJSON(`/campanias/${id}/maestro/${encodeURIComponent(limpio)}`, {
    timeoutMs: MASTER_TIMEOUT_MS,
    returnNullOn404: true,
    onRequestError: (error) => {
      if (/timeout/i.test(String(error?.message || ""))) {
        return new Error("No se pudo consultar el maestro de la campaña. Reintentar. (timeout)");
      }
      return new Error("No se pudo consultar el maestro de la campaña. Reintentar.");
    },
    onHttpError: ({ message }) => new Error(`No se pudo consultar el maestro de la campaña. Reintentar. (${message})`),
  });
}

export async function getMaestroList({ q = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams({
    q: String(q || '').trim(),
    page: String(page),
    pageSize: String(pageSize),
  });
  return fetchJSON(`/maestro?${params.toString()}`);
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
    email: String(email || '').trim(),
    sucursal: String(sucursal || '').trim(),
    campaniaId: Number(campaniaId || 0),
    skuRaw: String(skuRaw || '').trim(),
    skuNormalized: String(skuNormalized || '').trim(),
    sugeridos: {
      categoria_cod: normalizeSuggestedCode(sugeridos.categoria_cod),
      tipo_cod: normalizeSuggestedCode(sugeridos.tipo_cod),
      clasif_cod: normalizeSuggestedCode(sugeridos.clasif_cod),
    },
  };
  return fetchJSON(`/escaneos`, { method: "POST", body: JSON.stringify(body) });
}

export { API_BASE, API };
