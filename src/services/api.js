import { parseCode, parseSku } from "../utils/sku.js";
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
  const parsed = parseSku(sku);
  if (!parsed.valid) throw new Error("SKU inválido");
  const limpio = parsed.normalized;

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
  const parsed = parseSku(sku);
  const limpio = parsed.normalized;
  const id = Number(campaniaId || 0);
  if (!id) throw new Error("Campaña inválida");
  if (!parsed.valid) throw new Error("SKU inválido");

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
  campaniaId,
  skuRaw,
  idempotencyKey,
  sugeridos = {},
}) {
  const normalizeSuggestedCode = (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return "";
    const parsed = parseCode(trimmed);
    if (!parsed.valid) throw new Error("Los códigos deben tener uno o dos dígitos y no se truncarán");
    return parsed.normalized;
  };
  const parsedSku = parseSku(skuRaw);
  if (!parsedSku.valid) throw new Error("SKU inválido");
  const body = {
    campaniaId: Number(campaniaId || 0),
    skuRaw: String(skuRaw || '').trim(),
    skuNormalized: parsedSku.normalized,
    idempotencyKey: String(idempotencyKey || '').trim(),
    sugeridos: {
      categoria_cod: normalizeSuggestedCode(sugeridos.categoria_cod),
      tipo_cod: normalizeSuggestedCode(sugeridos.tipo_cod),
      clasif_cod: normalizeSuggestedCode(sugeridos.clasif_cod),
    },
  };
  return fetchJSON(`/escaneos`, { method: "POST", credentials: "include", body: JSON.stringify(body) });
}

export { API_BASE, API };
