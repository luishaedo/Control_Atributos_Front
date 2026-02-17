function isFormDataBody(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  return { contentType, isJson, body };
}

export async function fetchHttp(url, options = {}) {
  const {
    timeoutMs = 0,
    signal: externalSignal,
    defaultJsonContentType = true,
    onRequestError,
    onHttpError,
    returnNullOn404 = false,
    responseType = "json",
    ...requestOptions
  } = options;

  const headers = { ...(requestOptions.headers || {}) };
  const hasBody = requestOptions.body !== undefined && requestOptions.body !== null;
  if (defaultJsonContentType && hasBody && !headers["Content-Type"] && !isFormDataBody(requestOptions.body)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const abortListener = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortListener, { once: true });
  }

  let response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    const normalizedError = controller.signal.aborted ? new Error(`Request timeout for ${url}`) : error;
    if (onRequestError) {
      throw onRequestError(normalizedError);
    }
    throw normalizedError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", abortListener);
  }

  if (returnNullOn404 && response.status === 404) return null;

  if (!response.ok) {
    const { isJson, body } = await parseResponseBody(response);
    const message = isJson && (body?.error || body?.message)
      ? (body.error || body.message)
      : String(body || response.statusText || `HTTP ${response.status}`);

    if (onHttpError) {
      throw onHttpError({
        status: response.status,
        statusText: response.statusText,
        message,
        body,
      });
    }

    throw new Error(`HTTP ${response.status} ${response.statusText} — ${message}`);
  }

  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();

  const { isJson, body } = await parseResponseBody(response);
  return isJson ? body : {};
}

export function fetchHttpJson(url, options = {}) {
  return fetchHttp(url, { ...options, responseType: "json" });
}

export function fetchHttpBlob(url, options = {}) {
  return fetchHttp(url, { ...options, responseType: "blob" });
}
