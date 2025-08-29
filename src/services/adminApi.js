// src/services/adminApi.js — versión unificada (todo en uno)
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Token admin en localStorage
function getToken() { return localStorage.getItem('cc_admin_token') || '' }
export function adminSetToken(t) { if (!t) localStorage.removeItem('cc_admin_token'); else localStorage.setItem('cc_admin_token', t) }
export function adminGetToken() { return getToken() }

// Fetch autenticado
async function fetchAuth(path, options = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    ...options,
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text}`)
  }
  return resp
}

// --- Admin: autenticación ---
export async function adminPing() {
  const r = await fetchAuth('/admin/ping')
  return r.json()
}

// --- Importadores JSON ---
export async function importarDiccionariosJSON(payload) {
  const r = await fetchAuth('/admin/diccionarios/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return r.json()
}
export async function importarMaestroJSON(items) {
  const r = await fetchAuth('/admin/maestro/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  return r.json()
}

// --- Campañas ---
export async function crearCampania(data) {
  const r = await fetchAuth('/admin/campanias', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return r.json()
}

// --- Auditoría ---
export async function getDiscrepancias(campaniaId) {
  const r = await fetchAuth(`/admin/discrepancias?campaniaId=${encodeURIComponent(campaniaId)}`)
  return r.json()
}
export async function getDiscrepanciasSucursales(campaniaId) {
  const r = await fetchAuth(`/admin/discrepancias-sucursales?campaniaId=${encodeURIComponent(campaniaId)}`)
  return r.json()
}
export async function exportDiscrepanciasCSV(campaniaId) {
  const r = await fetchAuth(`/admin/export/discrepancias.csv?campaniaId=${encodeURIComponent(campaniaId)}`)
  return r.blob()
}

export async function getRevisiones(params) {
  const q = new URLSearchParams(params || {}).toString()
  const r = await fetchAuth(`/admin/revisiones?${q}`)
  return r.json()
}
export async function decidirRevision(body) {
  const r = await fetchAuth('/admin/revisiones/decidir', { method: 'POST', body: JSON.stringify(body) })
  return r.json()
}
export async function listarActualizaciones(campaniaId, estado) {
  const q = new URLSearchParams({ campaniaId, ...(estado ? { estado } : {}) }).toString()
  const r = await fetchAuth(`/admin/actualizaciones?${q}`)
  return r.json()
}
export async function exportActualizacionesCSV(campaniaId) {
  const r = await fetchAuth(`/admin/export/actualizaciones.csv?campaniaId=${encodeURIComponent(campaniaId)}`)
  return r.blob()
}
export async function aplicarActualizaciones(ids, decidedBy='') {
  const r = await fetchAuth('/admin/actualizaciones/aplicar', { method: 'POST', body: JSON.stringify({ ids, decidedBy }) })
  return r.json()
}

// --- Exports CSV (Maestro y Diccionarios) ---
export async function exportMaestroCSV() {
  const r = await fetchAuth('/admin/export/maestro.csv')
  return r.blob()
}
export async function exportCategoriasCSV() {
  const r = await fetchAuth('/admin/export/categorias.csv')
  return r.blob()
}
export async function exportTiposCSV() {
  const r = await fetchAuth('/admin/export/tipos.csv')
  return r.blob()
}
export async function exportClasifCSV() {
  const r = await fetchAuth('/admin/export/clasif.csv')
  return r.blob()
}

export async function exportTxtCategoria(campaniaId, estado = 'aceptadas') {
  const url = `/admin/export/txt/categoria?campaniaId=${encodeURIComponent(campaniaId)}&estado=${encodeURIComponent(estado)}`
  const r = await fetchAuth(url)
  return r.blob()
}
export async function exportTxtTipo(campaniaId, estado = 'aceptadas') {
  const url = `/admin/export/txt/tipo?campaniaId=${encodeURIComponent(campaniaId)}&estado=${encodeURIComponent(estado)}`
  const r = await fetchAuth(url)
  return r.blob()
}
export async function exportTxtClasif(campaniaId, estado = 'aceptadas') {
  const url = `/admin/export/txt/clasif?campaniaId=${encodeURIComponent(campaniaId)}&estado=${encodeURIComponent(estado)}`
  const r = await fetchAuth(url)
  return r.blob()
}

