// src/services/adminApi.js — versión completa y consistente
const API_BASE =
  import.meta.env?.VITE_API_URL?.replace(/\/$/, "") || window.location.origin;

// ===== Token admin (localStorage)

function getToken() {
  return localStorage.getItem("cc_admin_token") || "";
}
export function adminSetToken(t) {
  if (!t) localStorage.removeItem("cc_admin_token");
  else localStorage.setItem("cc_admin_token", String(t));
}
export function adminGetToken() {
  return getToken();
}

// ===== Headers con Authorization
function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

// ===== Guards y utilidades comunes
function assertHasCampaignId(campaniaId, ctx = "operación") {
  const n = Number(campaniaId);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`campaniaId requerido en frontend para ${ctx}`);
  }
  return String(n);
}

function qsFrom(obj) {
  const qs = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  return qs.toString();
}



// ===== Helpers fetch
async function fetchAuth(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  if (options.body && !headers["Content-Type"])
    headers["Content-Type"] = "application/json";
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp;
}
async function fetchAuthJSON(path, options) {
  const r = await fetchAuth(path, options);
  return r.json().catch(() => ({}));
}
async function fetchAuthBlob(path, options) {
  const r = await fetchAuth(path, options);
  return r.blob();
}

// ======================= Admin: ping
export function adminPing() {
  return fetchAuthJSON("/api/admin/ping");
}

// ======================= Importadores JSON (si tu back los expone por JSON)
export function importarDiccionariosJSON(payload) {
  return fetchAuthJSON("/api/admin/diccionarios/import-json", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
export function importarMaestroJSON(items) {
  return fetchAuthJSON("/api/admin/maestro/import-json", {
    method: "POST",
    body: JSON.stringify({ items: items || [] }),
  });
}

// ======================= Campañas (crear por público /api)
export function crearCampania(data) {
  return fetchAuthJSON("/api/campanias", {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

// ======================= Auditoría (Admin.jsx)
export function getDiscrepancias(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getDiscrepancias");
  return fetchAuthJSON(`/api/admin/discrepancias?${qsFrom({ campaniaId: id })}`);
}
export function getDiscrepanciasSucursales(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getDiscrepanciasSucursales");
  return fetchAuthJSON(`/api/admin/discrepancias-sucursales?${qsFrom({ campaniaId: id })}`);
}
export function exportDiscrepanciasCSV(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportDiscrepanciasCSV");
  return fetchAuthBlob(`/api/admin/export/discrepancias.csv?${qsFrom({ campaniaId: id })}`);
}
export function exportDiscrepanciasSucursalesCSV(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportDiscrepanciasSucursalesCSV");
  return fetchAuthBlob(`/api/admin/export/discrepancias-sucursales.csv?${qsFrom({ campaniaId: id })}`);
}
// CSV globales que usa Admin.jsx
export function exportMaestroCSV() {
  return fetchAuthBlob(`/api/admin/export/maestro.csv`);
}
export function exportCategoriasCSV() {
  return fetchAuthBlob(`/api/admin/export/categorias.csv`);
}
export function exportTiposCSV() {
  return fetchAuthBlob(`/api/admin/export/tipos.csv`);
}
export function exportClasifCSV() {
  return fetchAuthBlob(`/api/admin/export/clasif.csv`);
}

// ======================= Revisiones (tarjetas)
export function getRevisiones({
  campaniaId,
  sku,
  consenso,           
  soloConDiferencias = true
} = {}) {
  const id = assertHasCampaignId(campaniaId, "getRevisiones");
  const query = {
    campaniaId: id,
    
    ...(sku ? { sku: String(sku).trim().toUpperCase() } : {}),
    ...(consenso !== undefined && consenso !== "" ? { consenso: String(consenso) } : {}),
    ...(soloConDiferencias !== undefined ? { soloConDiferencias: String(soloConDiferencias) } : {})
  };
  return fetchAuthJSON(`/api/admin/revisiones?${qsFrom(query)}`);
}

export async function decidirRevision({
  campaniaId,
  sku,
  propuesta,        // { categoria_cod?, tipo_cod?, clasif_cod? }
  decision,         // 'aceptar' | 'rechazar'
  aplicarAhora = false,
  decidedBy,
  notas
}) {
  const id = assertHasCampaignId(campaniaId, "decidirRevision");
  if (!sku) throw new Error("sku requerido en frontend para decidirRevision");
  if (!decision) throw new Error("decision requerida ('aceptar'|'rechazar')");

  const body = {
    campaniaId: Number(id),
    sku: String(sku).trim().toUpperCase(),
    propuesta: propuesta || {},
    decision: String(decision),
    aplicarAhora: Boolean(aplicarAhora),
    ...(decidedBy ? { decidedBy } : {}),
    ...(notas ? { notas } : {})
  };
  return fetchAuthJSON(`/api/admin/revisiones/decidir`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// ======================= Cola de actualizaciones
// listar con filtros server-side
export function listarActualizaciones(campaniaId, opts) {
  const id = assertHasCampaignId(campaniaId, "listarActualizaciones");
  const query = { campaniaId: id };

  if (typeof opts === "string") {
    if (opts) query.estado = opts; // 'pendiente'|'aplicada'|'rechazada'
  } else if (opts && typeof opts === "object") {
    const { estado, archivada } = opts;
    if (estado) query.estado = estado;
    if (archivada !== undefined && archivada !== "") query.archivada = String(archivada);
  }

  return fetchAuthJSON(`/api/admin/actualizaciones?${qsFrom(query)}`);
}

export function aplicarActualizaciones(ids = [], decidedBy = "") {
  //return fetchAuthJSON(`/api/admin/actualizaciones/aplicar`, {
  return fetchAuthJSON(`/api/admin/actualizaciones/aplicar`, {
    method: "POST",
    body: JSON.stringify({ ids, decidedBy }),
  });
}
export function archivarActualizaciones(
  ids = [],
  archivada = true,
  archivadaBy = ""
) {
  return fetchAuthJSON(`/api/admin/actualizaciones/archivar`, {
    method: "POST",
    body: JSON.stringify({ ids, archivada, archivadaBy }),
  });
}
export function undoActualizacion(id) {
  return fetchAuthJSON(`/api/admin/actualizaciones/undo`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
export function revertirActualizacion(id) {
  return fetchAuthJSON(
    `/api/admin/actualizaciones/${encodeURIComponent(id)}/revertir`,
    { method: "POST" }
  );
}
export function exportActualizacionesCSV(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportActualizacionesCSV");
  return fetchAuthBlob(`/api/admin/export/actualizaciones.csv?${qsFrom({ campaniaId: id })}`);
}

// ======================= Exports TXT (por campo)
export function exportTxtCategoria(campaniaId, estado = "aceptadas", incluirArchivadas = false) {
  const id = assertHasCampaignId(campaniaId, "exportTxtCategoria");
  return fetchAuthBlob(`/api/admin/export/txt/categoria?${qsFrom({
    campaniaId: id, estado, ...(incluirArchivadas ? { incluirArchivadas: "true" } : {})
  })}`);
}

export function exportTxtTipo(campaniaId, estado = "aceptadas", incluirArchivadas = false) {
  const id = assertHasCampaignId(campaniaId, "exportTxtTipo");
  return fetchAuthBlob(`/api/admin/export/txt/tipo?${qsFrom({
    campaniaId: id, estado, ...(incluirArchivadas ? { incluirArchivadas: "true" } : {})
  })}`);
}

export function exportTxtClasif(campaniaId, estado = "aceptadas", incluirArchivadas = false) {
  const id = assertHasCampaignId(campaniaId, "exportTxtClasif");
  return fetchAuthBlob(`/api/admin/export/txt/clasif?${qsFrom({
    campaniaId: id, estado, ...(incluirArchivadas ? { incluirArchivadas: "true" } : {})
  })}`);
}
