const RAW_API_URL = import.meta.env?.VITE_API_URL || "";

function normalizeBase(url) {
  return String(url || "").replace(/\/$/, "");
}

function resolveApiBase() {
  const trimmed = String(RAW_API_URL || "").trim();
  if (trimmed) return normalizeBase(trimmed);

  throw new Error(
    "VITE_API_URL is required. Define it in .env.local (example: VITE_API_URL=http://localhost:4000)."
  );
}

const API_BASE = resolveApiBase();
const API = (path = "") => `${API_BASE}/api${path}`;

export { API_BASE, API };
