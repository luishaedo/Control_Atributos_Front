// src/api/auditoria.js
const BASE = import.meta.env.VITE_API_BASE || '' // ej: "http://localhost:4000"

function adminHeaders(token) {
  const t = token || localStorage.getItem('cc_admin_token') || ''
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function apiListCampanias() {
  const res = await fetch(`${BASE}/api/campanias`)
  if (!res.ok) throw new Error(`GET campanias ${res.status}`)
  return res.json()
}

export async function apiGetDiscrepancias({ campaniaId, sku = '', minVotos = 1, token = '' }) {
  const params = new URLSearchParams({ campaniaId: String(campaniaId), sku, minVotos: String(minVotos) })
  const res = await fetch(`${BASE}/api/admin/discrepancias?${params.toString()}`, {
    headers: adminHeaders(token),
  })
  if (!res.ok) throw new Error(`GET discrepancias ${res.status}`)
  return res.json()
}

export async function apiGetDiscrepanciasSucursales({ campaniaId, sku = '', minSucursales = 2, token = '' }) {
  const params = new URLSearchParams({ campaniaId: String(campaniaId), sku, minSucursales: String(minSucursales) })
  const res = await fetch(`${BASE}/api/admin/discrepancias-sucursales?${params.toString()}`, {
    headers: adminHeaders(token),
  })
  if (!res.ok) throw new Error(`GET sucursales ${res.status}`)
  return res.json()
}

export function apiExportDiscrepanciasCSV(campaniaId) {
  const url = `${BASE}/api/admin/export/discrepancias.csv?campaniaId=${campaniaId}`
  window.open(url, '_blank')
}
