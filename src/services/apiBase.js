const RAW_API_URL = import.meta.env?.VITE_API_URL || "";
const IS_PROD = Boolean(import.meta.env?.PROD);

function normalizeBase(url) {
  return String(url || "").replace(/\/$/, "");
}

function resolveApiBase() {
  const trimmed = String(RAW_API_URL || "").trim();
  if (trimmed) return normalizeBase(trimmed);

  if (IS_PROD) {
    throw new Error(
      "VITE_API_URL is required in production. Set it to your backend base URL."
    );
  }

  return window.location.origin;
}

const API_BASE = resolveApiBase();
const API = (path = "") => `${API_BASE}/api${path}`;

export { API_BASE, API };
