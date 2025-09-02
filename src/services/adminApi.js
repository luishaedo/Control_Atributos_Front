// src/services/adminApi.js — versión unificada (todo en uno)
const API_BASE = import.meta.env?.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// ===== Token admin (localStorage) =====
function getToken() { return localStorage.getItem('cc_admin_token') || '' }
export function adminSetToken(t) { if (!t) localStorage.removeItem('cc_admin_token'); else localStorage.setItem('cc_admin_token', t) }
export function adminGetToken() { return getToken() }

// ===== Headers con Authorization =====
function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

// ===== Fetch helper genérico =====
// Devuelve la Response (usá .json() o .blob() según corresponda)
async function fetchAuth(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  // Si mandamos body y no indicaron Content-Type, ponemos JSON por defecto
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text}`);
  }
  return resp;
}

// Helpers específicos
async function fetchAuthJSON(path, options) {
  const r = await fetchAuth(path, options);
  return r.json();
}
async function fetchAuthBlob(path, options) {
  const r = await fetchAuth(path, options);
  return r.blob();
}

// =======================
// Admin: autenticación
// =======================
export function adminPing() {
  return fetchAuthJSON('/api/admin/ping');
}

// =======================
// Importadores JSON
// =======================
export function importarDiccionariosJSON(payload) {
  return fetchAuthJSON('/api/admin/diccionarios/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export function importarMaestroJSON(items) {
  return fetchAuthJSON('/api/admin/maestro/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// =======================
// Campañas
// =======================
export function crearCampania(data) {
  return fetchAuthJSON('/api/admin/campanias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// =======================
// Auditoría
// =======================
export function getDiscrepancias(campaniaId) {
  const qs = new URLSearchParams({ campaniaId }).toString();
  return fetchAuthJSON(`/api/admin/discrepancias?${qs}`);
}
export function getDiscrepanciasSucursales(campaniaId) {
  const qs = new URLSearchParams({ campaniaId }).toString();
  return fetchAuthJSON(`/api/admin/discrepancias-sucursales?${qs}`);
}
export function exportDiscrepanciasCSV(campaniaId) {
  const qs = new URLSearchParams({ campaniaId }).toString();
  return fetchAuthBlob(`/api/admin/export/discrepancias.csv?${qs}`);
}

// =======================
// Revisiones
// =======================
export function getRevisiones(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return fetchAuthJSON(`/api/admin/revisiones?${qs}`);
}

export function decidirRevision(body) {
  return fetchAuthJSON('/api/admin/revisiones/decidir', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// =======================
// Actualizaciones (cola)
// =======================
// 2º parámetro puede ser string 'pendiente' | 'aplicada' | 'rechazada' o un objeto { estado, archivada }
export function listarActualizaciones(campaniaId, opts = undefined) {
  const qs = new URLSearchParams({ campaniaId });

  if (typeof opts === 'string') {
    if (opts) qs.set('estado', opts);
  } else if (opts && typeof opts === 'object') {
    const { estado, archivada } = opts;
    if (estado) qs.set('estado', estado);           // 'pendiente' | 'aplicada' | 'rechazada'
    if (archivada) qs.set('archivada', archivada);  // 'true' | 'false' | 'todas'
  }

  return fetchAuthJSON(`/api/admin/actualizaciones?${qs.toString()}`);
}

export function exportActualizacionesCSV(campaniaId) {
  const qs = new URLSearchParams({ campaniaId }).toString();
  return fetchAuthBlob(`/api/admin/export/actualizaciones.csv?${qs}`);
}

export function aplicarActualizaciones(ids, decidedBy = '') {
  return fetchAuthJSON('/api/admin/actualizaciones/aplicar', {
    method: 'POST',
    body: JSON.stringify({ ids, decidedBy }),
  });
}

// Archivar / desarchivar (usado por UI y como "undo" temporal)
export function archivarActualizaciones(ids, archivada = true, archivadaBy = '') {
  return fetchAuthJSON('/api/admin/actualizaciones/archivar', {
    method: 'POST',
    body: JSON.stringify({ ids, archivada, archivadaBy }),
  });
}

// =======================
// Exports CSV (dic/maestro)
// =======================
export function exportMaestroCSV() {
  return fetchAuthBlob('/api/admin/export/maestro.csv');
}
export function exportCategoriasCSV() {
  return fetchAuthBlob('/api/admin/export/categorias.csv');
}
export function exportTiposCSV() {
  return fetchAuthBlob('/api/admin/export/tipos.csv');
}
export function exportClasifCSV() {
  return fetchAuthBlob('/api/admin/export/clasif.csv');
}

// =======================
// Exports TXT por campo
// =======================
// estado: 'aceptadas' (pendiente+aplicada) | 'aplicada'
// incluirArchivadas (bool) si querés traer también archivadas
export function exportTxtCategoria(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId, estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/categoria?${qs.toString()}`);
}
export function exportTxtTipo(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId, estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/tipo?${qs.toString()}`);
}
export function exportTxtClasif(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId, estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/clasif?${qs.toString()}`);
}

// =======================
// Undo / Revert (provisorio => archivar)
// =======================
// Si todavía no tenés endpoints /undo y /revertir en el backend, usamos archivar como "deshacer".
export function undoActualizacion(id) {
  return archivarActualizaciones([id], true, 'undo-ui');
}
export function revertirActualizacion(id) {
  return archivarActualizaciones([id], true, 'revert-ui');
}
