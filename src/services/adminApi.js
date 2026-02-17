// src/services/adminApi.js — versión completa y consistente
import { pad2 } from "../utils/sku.js";
import { API_BASE } from "./apiBase.js";
import { createHttpClient } from "./httpClient.js";

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
function createAdminUrl(path) {
  return `${API_BASE}${path}`;
}

function toAdminHttpError({ status, message }) {
  return new Error(message || `HTTP ${status}`);
}

const adminHttp = createHttpClient({
  credentials: "include",
  onHttpError: toAdminHttpError,
});

function fetchAuthJSON(path, options = {}) {
  return adminHttp.json(createAdminUrl(path), options);
}

function fetchAuthBlob(path, options = {}) {
  return adminHttp.blob(createAdminUrl(path), options);
}


// ======================= Admin: ping
export function adminPing() {
  return fetchAuthJSON("/api/admin/ping");
}

export function adminLogin(token) {
  return fetchAuthJSON("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ token: String(token || "") }),
  });
}

export function adminLogout() {
  return fetchAuthJSON("/api/admin/logout", { method: "POST" });
}

// ======================= Importadores JSON (si tu back los expone por JSON)
export function importarDiccionariosJSON(payload) {
  const normalized = normalizeDictionaryPayload(payload);
  return fetchAuthJSON("/api/admin/diccionarios/import-json", {
    method: "POST",
    body: JSON.stringify(normalized),
  });
}
export function importarMaestroJSON(items) {
  return fetchAuthJSON("/api/admin/maestro/import-json", {
    method: "POST",
    body: JSON.stringify({ items: items || [] }),
  });
}

// ======================= Maestro (missing)
export function getMissingMaestro(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getMissingMaestro");
  return fetchAuthJSON(`/api/admin/maestro/missing?${qsFrom({ campaniaId: id })}`);
}

// ======================= Confirmaciones
export function getConfirmaciones(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getConfirmaciones");
  return fetchAuthJSON(`/api/admin/confirmaciones?${qsFrom({ campaniaId: id })}`);
}

export function updateUnknownSku(sku, payload = {}) {
  if (!sku) throw new Error("sku requerido para updateUnknownSku");
  return fetchAuthJSON(`/api/admin/desconocidos/${encodeURIComponent(sku)}`, {
    method: "PATCH",
    body: JSON.stringify(payload || {}),
  });
}

export function confirmUnknownSku(sku, payload = {}) {
  if (!sku) throw new Error("sku requerido para confirmUnknownSku");
  return fetchAuthJSON(`/api/admin/desconocidos/${encodeURIComponent(sku)}/confirmar`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export function updateUnknown(payload = {}) {
  const sku = payload?.sku;
  if (!sku) throw new Error("sku requerido para updateUnknown");
  return fetchAuthJSON(`/api/admin/desconocidos/${encodeURIComponent(String(sku).trim().toUpperCase())}`, {
    method: "PATCH",
    body: JSON.stringify(payload || {}),
  });
}

export function confirmUnknown(payload = {}) {
  const unknownId = payload?.unknownId;
  if (unknownId) {
    return fetchAuthJSON(`/api/admin/unknowns/${encodeURIComponent(unknownId)}/approve`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }
  const sku = payload?.sku;
  if (!sku) throw new Error("unknownId o sku requerido para confirmUnknown");
  return confirmUnknownSku(sku, payload);
}

export function rejectUnknown(payload = {}) {
  const unknownId = payload?.unknownId;
  if (!unknownId) throw new Error("unknownId requerido para rejectUnknown");
  return fetchAuthJSON(`/api/admin/unknowns/${encodeURIComponent(unknownId)}/reject`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export function moverEtapa({ campaniaId, sku, stage, updatedBy } = {}) {
  const id = assertHasCampaignId(campaniaId, "moverEtapa");
  if (!sku) throw new Error("sku requerido para moverEtapa");
  if (!stage) throw new Error("stage requerido para moverEtapa");
  return fetchAuthJSON(`/api/admin/etapas/mover`, {
    method: "POST",
    body: JSON.stringify({
      campaniaId: Number(id),
      sku: String(sku).trim().toUpperCase(),
      stage: String(stage),
      ...(updatedBy ? { updatedBy } : {}),
    }),
  });
}

// ======================= Consolidación
export function getConsolidacionCambios(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getConsolidacionCambios");
  return fetchAuthJSON(`/api/admin/consolidacion/cambios?${qsFrom({ campaniaId: id })}`);
}

export function cerrarCampania(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "cerrarCampania");
  return fetchAuthJSON(`/api/admin/campanias/${encodeURIComponent(id)}/cerrar`, {
    method: "POST",
  });
}

// ======================= Campañas
export function crearCampania(data) {
  return fetchAuthJSON("/api/admin/campanias", {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

export function activarCampania(id) {
  if (!id) throw new Error("id requerido para activarCampania");
  return fetchAuthJSON(`/api/admin/campanias/${encodeURIComponent(id)}/activar`, {
    method: "POST",
  });
}

export function actualizarCampania(id, data) {
  if (!id) throw new Error("id requerido para actualizarCampania");
  return fetchAuthJSON(`/api/admin/campanias/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data || {}),
  });
}

// ======================= Auditoría (Admin.jsx)
export function getDiscrepancias(campaniaId, opts = {}) {
  const id = assertHasCampaignId(campaniaId, "getDiscrepancias");
  const query = {
    campaniaId: id,
    ...(opts.sku ? { sku: String(opts.sku) } : {}),
    ...(opts.minVotos !== undefined ? { minVotos: String(opts.minVotos) } : {}),
  };
  return fetchAuthJSON(`/api/admin/discrepancias?${qsFrom(query)}`);
}
export function getDiscrepanciasSucursales(campaniaId, opts = {}) {
  const id = assertHasCampaignId(campaniaId, "getDiscrepanciasSucursales");
  const query = {
    campaniaId: id,
    ...(opts.sku ? { sku: String(opts.sku) } : {}),
    ...(opts.minSucursales !== undefined ? { minSucursales: String(opts.minSucursales) } : {}),
  };
  return fetchAuthJSON(`/api/admin/discrepancias-sucursales?${qsFrom(query)}`);
}
export function exportDiscrepanciasCSV(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportDiscrepanciasCSV");
  return fetchAuthBlob(`/api/admin/export/discrepancias.csv?${qsFrom({ campaniaId: id })}`);
}
export function exportDiscrepanciasSucursalesCSV(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportDiscrepanciasSucursalesCSV");
  return fetchAuthBlob(`/api/admin/export/discrepancias-sucursales.csv?${qsFrom({ campaniaId: id })}`);
}
export function getAuditoriaResumen(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "getAuditoriaResumen");
  return fetchAuthJSON(`/api/admin/auditoria/resumen?${qsFrom({ campaniaId: id })}`);
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
export function exportTxtCategoria(campaniaId, estado = "applied") {
  const id = assertHasCampaignId(campaniaId, "exportTxtCategoria");
  return fetchAuthBlob(`/api/admin/export/txt/categoria?${qsFrom({
    campaniaId: id,
    scope: estado,
  })}`);
}

export function exportTxtTipo(campaniaId, estado = "applied") {
  const id = assertHasCampaignId(campaniaId, "exportTxtTipo");
  return fetchAuthBlob(`/api/admin/export/txt/tipo?${qsFrom({
    campaniaId: id,
    scope: estado,
  })}`);
}

export function exportTxtClasif(campaniaId, estado = "applied") {
  const id = assertHasCampaignId(campaniaId, "exportTxtClasif");
  return fetchAuthBlob(`/api/admin/export/txt/clasif?${qsFrom({
    campaniaId: id,
    scope: estado,
  })}`);
}

export function exportSummaryTxt(campaniaId) {
  const id = assertHasCampaignId(campaniaId, "exportSummaryTxt");
  return fetchAuthBlob(`/api/admin/export/txt/summary?${qsFrom({ campaniaId: id })}`);
}

export function fetchAdminBlobByUrl(url) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  return adminHttp.blob(fullUrl);
}

function normalizeDictionaryPayload(payload) {
  const data = payload || {};
  const normalizeList = (list) =>
    (list || []).map((item) => ({
      ...item,
      cod: pad2(item?.cod),
    }));

  return {
    categorias: normalizeList(data.categorias),
    tipos: normalizeList(data.tipos),
    clasif: normalizeList(data.clasif),
  };
}
