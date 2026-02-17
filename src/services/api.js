import { pad2 } from "../utils/sku.js";
import { API_BASE, API } from "./apiBase.js";

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

  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const abortListener = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortListener, { once: true });
  }

  let res;
  try {
    res = await fetch(API(path), {
      headers: { "Content-Type": "application/json", ...(requestOptions.headers || {}) },
      ...requestOptions,
      signal: controller.signal,
    });
  } catch (error) {
    const normalizedError = controller.signal.aborted
      ? new Error(`Request timeout for ${path}`)
      : error;

    if (onRequestError) {
      throw onRequestError(normalizedError);
    }

    throw normalizedError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", abortListener);
  }

  if (returnNullOn404 && res.status === 404) return null;

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const rawMsg = (isJSON && (body?.error || body?.message))
      ? (body.error || body.message)
      : String(body || res.statusText);

    if (onHttpError) {
      throw onHttpError({ status: res.status, statusText: res.statusText, message: rawMsg });
    }

    throw new Error(`HTTP ${res.status} ${res.statusText} — ${rawMsg}`);
  }

  return isJSON ? body : {};
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
