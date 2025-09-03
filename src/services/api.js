// src/services/api.js — versión conectada al servidor
import { pad2 } from '../utils/sku'

// Config: usá .env de Vite si querés cambiar la URL sin tocar código.
// Crear .env.local con: VITE_API_URL="http://localhost:4000/api"
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function fetchJSON(url, options) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!resp.ok) {
    // Caso particular: 404 en maestro => devolvemos null arriba
    const text = await resp.text().catch(() => '')
    throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text}`)
  }
  return resp.json()
}

// Diccionarios
export async function getDictionaries() {
  return fetchJSON(`${BASE}/diccionarios`)
}

// Campañas
export async function getCampaigns() {
  return fetchJSON(`${BASE}/campanias`)
}

export async function setActiveCampaign(id) {
  return fetchJSON(`${BASE}/campanias/${id}/activar`, { method: 'POST' })
}

// Maestro
export async function getMasterBySku(sku) {
  try {
    const resp = await fetch(`${BASE}/maestro/${encodeURIComponent(sku)}`)
    if (resp.status === 404) return null
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return await resp.json()
  } catch (err) {
    throw err
  }
}

export async function getMaestroList({ q = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  const res = await fetch(`/api/maestro?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json() // { items, total, page, pageSize }
}

// Escaneos
// Nota: el backend responde {estado, maestro, asumidos}.
// Para no tocar tu UI, devolvemos { ok: true, ...data }.
export async function saveScan(payload) {
  const data = await fetchJSON(`${BASE}/escaneos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return { ok: true, ...data }
}

// Helper
export function getNombre(dicArr, cod) {
  const c = pad2(cod)
  const item = (dicArr || []).find(d => d.cod === c)
  return item ? item.nombre : ''
}
